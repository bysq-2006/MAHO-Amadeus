use serde::Serialize;
use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Serialize)]
struct ConfigFile {
    path: String,
    content: String,
}

#[derive(Serialize)]
struct DocItem {
    id: String,
    title: String,
    path: String,
}

#[derive(Serialize)]
struct DocFile {
    id: String,
    title: String,
    path: String,
    content: String,
}

struct EmbeddedDoc {
    id: &'static str,
    content: &'static str,
}

include!(concat!(env!("OUT_DIR"), "/embedded_docs.rs"));

fn current_exe_dir() -> Result<PathBuf, String> {
    let exe_path =
        env::current_exe().map_err(|error| format!("Cannot locate app executable: {}", error))?;
    exe_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Cannot locate app executable directory".to_string())
}

fn join_relative(base: &Path, relative_parts: &[&str]) -> PathBuf {
    relative_parts
        .iter()
        .fold(base.to_path_buf(), |path, part| path.join(part))
}

fn find_root_containing(start: &Path, relative_parts: &[&str]) -> Option<PathBuf> {
    start
        .ancestors()
        .find(|candidate| join_relative(candidate, relative_parts).exists())
        .map(Path::to_path_buf)
}

fn runtime_root_containing(relative_parts: &[&str]) -> Result<PathBuf, String> {
    let exe_dir = current_exe_dir()?;

    if let Some(root) = find_root_containing(&exe_dir, relative_parts) {
        return Ok(root);
    }

    if let Ok(current_dir) = env::current_dir() {
        if let Some(root) = find_root_containing(&current_dir, relative_parts) {
            return Ok(root);
        }
    }

    Ok(exe_dir)
}

fn default_config_path() -> Result<PathBuf, String> {
    let relative_parts = ["backend", "config.yaml"];
    Ok(join_relative(
        &runtime_root_containing(&relative_parts)?,
        &relative_parts,
    ))
}

fn selected_config_path(path: Option<String>) -> Result<PathBuf, String> {
    match path {
        Some(path) if !path.trim().is_empty() => Ok(PathBuf::from(path.trim())),
        _ => default_config_path(),
    }
}

fn dialog_initial_dir(path: Option<String>) -> Result<PathBuf, String> {
    if let Some(path) = path {
        let path = PathBuf::from(path.trim());
        if path.is_dir() {
            return Ok(path);
        }

        if let Some(parent) = path.parent() {
            return Ok(parent.to_path_buf());
        }
    }

    default_config_path()?
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Cannot locate default config directory".to_string())
}

#[tauri::command]
fn load_config(path: Option<String>) -> Result<ConfigFile, String> {
    let path = selected_config_path(path)?;
    let content = fs::read_to_string(&path).map_err(|error| format!("读取配置失败: {}", error))?;

    Ok(ConfigFile {
        path: path.display().to_string(),
        content,
    })
}

#[tauri::command]
fn save_config(content: String, path: Option<String>) -> Result<(), String> {
    let path = selected_config_path(path)?;
    fs::write(&path, content).map_err(|error| format!("保存配置失败: {}", error))
}

#[tauri::command]
fn pick_config_file(current_path: Option<String>) -> Result<Option<String>, String> {
    let initial_dir = dialog_initial_dir(current_path)?;
    let script = r#"
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = '选择配置文件'
$dialog.Filter = 'YAML 配置 (*.yaml;*.yml)|*.yaml;*.yml|所有文件 (*.*)|*.*'
$dialog.CheckFileExists = $true
$dialog.Multiselect = $false
if ($args.Count -gt 0 -and $args[0] -and (Test-Path -LiteralPath $args[0])) {
    $dialog.InitialDirectory = $args[0]
}
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dialog.FileName
}
"#;

    let mut command = Command::new("powershell.exe");
    command
        .args(["-NoProfile", "-STA", "-Command", script])
        .arg(initial_dir);

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let output = command
        .output()
        .map_err(|error| format!("打开文件选择器失败: {}", error))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("打开文件选择器失败: {}", error.trim()));
    }

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok((!path.is_empty()).then_some(path))
}

#[tauri::command]
fn list_docs() -> Result<Vec<DocItem>, String> {
    let mut docs = EMBEDDED_DOCS
        .iter()
        .map(|doc| DocItem {
            id: doc.id.to_string(),
            title: doc_title(doc.id),
            path: format!("embedded://docs/{}", doc.id),
        })
        .collect::<Vec<_>>();
    docs.sort_by(|a, b| a.title.cmp(&b.title));
    Ok(docs)
}

#[tauri::command]
fn read_doc(id: String) -> Result<DocFile, String> {
    let doc = EMBEDDED_DOCS
        .iter()
        .find(|doc| doc.id == id)
        .ok_or_else(|| "未找到内置文档".to_string())?;

    Ok(DocFile {
        id: doc.id.to_string(),
        title: doc_title(doc.id),
        path: format!("embedded://docs/{}", doc.id),
        content: doc.content.to_string(),
    })
}

fn doc_title(id: &str) -> String {
    Path::new(id)
        .file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or("未命名文档")
        .to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            pick_config_file,
            list_docs,
            read_doc
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
