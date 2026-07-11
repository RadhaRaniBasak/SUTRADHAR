export interface InsertNotionDocumentInput {
  databaseId: string;
  pageTitle: string;
  contentBlocks: string[];
}

export interface InsertNotionDocumentResult {
  id: string;
  url: string;
}