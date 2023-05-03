import path from "path";
import { EnvironmentVariableCollection, Extension, ExtensionContext, ExtensionKind, ExtensionMode, Memento, SecretStorage, Uri } from "vscode";

export class MockContext implements ExtensionContext {
  subscriptions: { dispose(): any; }[] = [];
  workspaceState!: Memento;
  globalState!: Memento & { setKeysForSync(keys: readonly string[]): void; };
  secrets!: SecretStorage;
  extensionUri!: Uri;
  extensionPath!: string;
  environmentVariableCollection!: EnvironmentVariableCollection;
  asAbsolutePath(relativePath: string): string {
    throw new Error("Method not implemented.");
  }
  storageUri: Uri | undefined;
  storagePath: string | undefined;
  globalStorageUri!: Uri;
  globalStoragePath!: string;
  logUri!: Uri;
  logPath!: string;
  extensionMode!: ExtensionMode;
  extension: Extension<any> = new MockExtension();
  
}

export class MockExtension implements Extension<any> {
  id!: string;
  extensionUri: Uri = Uri.file(path.sep);
  extensionPath!: string;
  isActive = false;
  packageJSON = { displayName: 'ade-source-control', version: '0.0.1'};
  extensionKind: ExtensionKind = 1;
  exports: any;
  activate(): Thenable<any> {
    throw new Error("Method not implemented.");
  }

}