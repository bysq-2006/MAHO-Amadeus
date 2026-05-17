export interface DocItem {
  id: string;
  title: string;
  path: string;
}

export interface DocFile extends DocItem {
  content: string;
}
