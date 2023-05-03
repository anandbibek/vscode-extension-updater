import { ExtensionContext } from "vscode";
import { GitLabExtensionUpdater } from "../../src/GitlabExtensionUpdater";
import { MockContext } from "./mocks";

describe("ConfluenceExtensionUpdater", () => {
  describe("#method()", () => {
      it("does nothing", () => {
          //new ConfluenceExtensionUpdater();
          //expect.
      });
  });
});

describe("GitlabExtensionUpdater", () => {

/*   extensions.getExtension('AnandaBibekRay.ade-source-control')?.activate();
  const extensionContext = (global as any).testExtensionContext; */

  const extensionContext: ExtensionContext = new MockContext();
  /* before(async () => {
      // Trigger extension activation and grab the context as some tests depend on it
      await extensions.getExtension('vscode.vscode-api-tests')?.activate();
      extensionContext = (global as any).testExtensionContext;
  }); */

  
  describe("#getNewVersionAndInstall()", () => {
      it("verify update", async () => {
          try {
              return new GitLabExtensionUpdater(extensionContext, {
                  gitlabHost: 'linux-git.oraclecorp.com',
                  projectId: 31775,
                  packageName: 'dev',
                  packageType: 'generic',
                  showUpToDateConfirmation: true
              }).getNewVersionAndInstall();
              
          }
          catch (err) {
              console.error('Failed to check for new version of the the extension: ', err);
          }
      }).timeout(120_000);
  });
});