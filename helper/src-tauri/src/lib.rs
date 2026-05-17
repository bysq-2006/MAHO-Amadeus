use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
};

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

fn repo_root() -> Result<PathBuf, String> {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|helper_dir| helper_dir.parent())
        .map(Path::to_path_buf)
        .ok_or_else(|| "无法定位仓库根目录".to_string())
}

fn default_config_path() -> Result<PathBuf, String> {
    Ok(repo_root()?.join("backend").join("config.yaml"))
}

fn selected_config_path(path: Option<String>) -> Result<PathBuf, String> {
    match path {
        Some(path) if !path.trim().is_empty() => Ok(PathBuf::from(path.trim())),
        _ => default_config_path(),
    }
}

fn docs_dir() -> Result<PathBuf, String> {
    Ok(repo_root()?.join("doc"))
}

#[tauri::command]
fn load_config(path: Option<String>) -> Result<ConfigFile, String> {
    let path = selected_config_path(path)?;
    let content = fs::read_to_string(&path)
        .map_err(|error| format!("读取配置失败: {}", error))?;

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
fn list_docs() -> Result<Vec<DocItem>, String> {
    let base = docs_dir()?;
    let mut docs = Vec::new();
    collect_docs(&base, &base, &mut docs)?;
    docs.sort_by(|a, b| a.title.cmp(&b.title));
    Ok(docs)
}

#[tauri::command]
fn read_doc(id: String) -> Result<DocFile, String> {
    let base = docs_dir()?;
    let path = base.join(&id);
    let canonical_base = base
        .canonicalize()
        .map_err(|error| format!("读取文档目录失败: {}", error))?;
    let canonical_path = path
        .canonicalize()
        .map_err(|error| format!("读取文档失败: {}", error))?;

    if !canonical_path.starts_with(&canonical_base) {
        return Err("文档路径不在 doc 目录内".to_string());
    }

    let content = fs::read_to_string(&canonical_path)
        .map_err(|error| format!("读取文档失败: {}", error))?;

    Ok(DocFile {
        id,
        title: doc_title(&canonical_path),
        path: canonical_path.display().to_string(),
        content,
    })
}

fn collect_docs(base: &Path, dir: &Path, docs: &mut Vec<DocItem>) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|error| format!("读取文档目录失败: {}", error))?;

    for entry in entries {
        let entry = entry.map_err(|error| format!("读取文档目录失败: {}", error))?;
        let path = entry.path();

        if path.is_dir() {
            collect_docs(base, &path, docs)?;
            continue;
        }

        let is_markdown = path
            .extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.eq_ignore_ascii_case("md"))
            .unwrap_or(false);

        if !is_markdown {
            continue;
        }

        let id = path
            .strip_prefix(base)
            .map_err(|error| format!("生成文档索引失败: {}", error))?
            .to_string_lossy()
            .replace('\\', "/");

        docs.push(DocItem {
            id,
            title: doc_title(&path),
            path: path.display().to_string(),
        });
    }

    Ok(())
}

fn doc_title(path: &Path) -> String {
    path.file_stem()
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
            list_docs,
            read_doc
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
