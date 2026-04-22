import config from '../config.json'

/**
 * 后端 public 资源的完整 URL。
 * 后端把 /public 挂载为静态目录，配置里存相对路径。
 */
export function resolveAssetUrl(relativePath: string): string {
  return `http://${config.ip}:8080/public/${relativePath}`
}
