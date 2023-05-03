# Visual Studio Code custom extension updater for private extension marketplaces

[![CI](https://github.com/anandbibek/vscode-extension-updater/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/anandbibek/vscode-extension-updater/actions/workflows/npm-publish.yml)
[![npm](https://img.shields.io/npm/v/vscode-extension-updater-gitlab)](https://www.npmjs.com/package/vscode-extension-updater-gitlab)


For context and motivation, please look at the [Private extension market](https://github.com/microsoft/vscode/issues/21839)
a.k.a _side loading_.

This package does not provide the extension marketplace (with the ability to pick an extension and install it),
but assuming you point your VS Code user population to download and install the extension manually,
as long as your extension starts this updater at its activation, this takes care of the usual workflow:

1. Checks whether new version is available
2. Asks user, whether they want to download and install now
3. Downloads the new version `.vsix` to a local temp file
4. Installs the new version
5. Offers to re-load the window to load the new version

This package purpose is to:

* Provide a base class for extension update abstracting from the type of the private repository
* Provider specific implementations (please contribute, if you see fit). So far there is support for
  * Confluence wiki
  * Gitlab package registry

Here is a demo of confluence extension:

![Extension auto-update from Confluence wiki attachment](confluence_wiki_extension_updater.gif)

## Get Started

Fetch the package using

```bash
npm install vscode-extension-updater-gitlab
```

### Using the Gitlab Package registry based private extension repository

Put this to your `extension.ts` (or `.js` if you insist) `activate` function:

```typescript
import { GitLabExtensionUpdater } from 'vscode-extension-updater-gitlab';

export function activate(context: ExtensionContext): void {

    // ... your extension activation code...

    setTimeout(() => {
        checkNewVersion(context, false);
    }, 30000); // give it 30sec before checking
}

async function checkNewVersion(context: ExtensionContext, showUpToDateConfirmation: boolean): Promise<void> {
    try {
        await new GitLabExtensionUpdater(context, {
            gitlabHost: 'linux-git.myorg.com',
            projectId: 31775,
            packageName: 'dev',
            packageType: 'generic',
            showUpToDateConfirmation: showUpToDateConfirmation
        }).getNewVersionAndInstall();
    }
    catch (err) {
        showErrorMessage('Failed to check for new version of the the extension: ', err);
    }
}
```

 - `gitlabHost` is your gitlab URL.
 - `projectId` is your package registry project's ID. Settings > General > Project ID
 - `packageName` is the fuzzy name of the package where artifact is uploaded.
 - `packageType` is the exact name of package type. Currently 'generic'.


### Adding manual check for new version

VS Code supports extension-specific commands. They show in the menu that displays when you click on the cogwheel button of your extension in the Extensions view. Add this to your `package.json`:

```json
{
    "contributes": {
        "commands": [
            {
                "command": "yourExt.checkForExtensionUpdate",
                "title": "yourExt: Check for new extension version..."
            },
        ],
        "menus": {
            "extension/context": [
                {
                    "command": "yourExt.checkForExtensionUpdate",
                    "when": "extension == publisherId.extensionId && extensionStatus == installed"
                }
            ]
}
```

... where `publisherId`, `extensionId` and `yourExt` must be replaced with the corresponding values from your `package.json`.

Add this to your `extension.ts` `activate()` method:

```typescript
    context.subscriptions.push(commands.registerCommand("yourExt.checkForExtensionUpdate", () =>
        checkNewVersion(context, true).catch(showError)));
```

In this case, we pass `true` to the `showUpToDateConfirmation` argument, which will show notification even if there is no new version.

## Implementing your own adapter to other custom back-end

Look at the `ConfluenceExtensionUpdater` class as an example of implementation.
Essentially, the only thing you may need to do is to implement this abstract method:

```typescript

import { ExtensionUpdater, ExtensionVersion } from './ExtensionUpdater';

export class YourExtensionUpdater extends ExtensionUpdater {

    constructor(context: ExtensionContext, options: YourMarketplaceOptions) {
        super(context);
        this.url = options.url;
        // ...
    }

    protected async getVersion(): Promise<ExtensionVersion> {
        // download
    }
}
```

And the base class would do the same if you integrate it into your extension's `activate` function.


## Original repo with Confluence downloader examples
[jan-dolejsi/vscode-extension-updater](https://github.com/jan-dolejsi/vscode-extension-updater)