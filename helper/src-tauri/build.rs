use std::{env, fs, path::PathBuf};

fn main() {
    generate_embedded_docs();
    tauri_build::build()
}

fn generate_embedded_docs() {
    let manifest_dir =
        PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is set"));
    let docs_dir = manifest_dir.join("docs");
    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR is set"));
    let output_path = out_dir.join("embedded_docs.rs");

    println!("cargo:rerun-if-changed={}", docs_dir.display());

    let mut docs = fs::read_dir(&docs_dir)
        .expect("read docs directory")
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension()
                .and_then(|extension| extension.to_str())
                .map(|extension| extension.eq_ignore_ascii_case("md"))
                .unwrap_or(false)
        })
        .collect::<Vec<_>>();

    docs.sort();

    for doc in &docs {
        println!("cargo:rerun-if-changed={}", doc.display());
    }

    let mut generated = String::from("const EMBEDDED_DOCS: &[EmbeddedDoc] = &[\n");
    for doc in docs {
        let id = doc
            .file_name()
            .and_then(|name| name.to_str())
            .expect("doc file name is valid unicode");
        let path = doc.to_string_lossy();
        generated.push_str(&format!(
            "    EmbeddedDoc {{ id: {:?}, content: include_str!({:?}) }},\n",
            id, path
        ));
    }
    generated.push_str("];\n");

    fs::write(output_path, generated).expect("write embedded docs source");
}
