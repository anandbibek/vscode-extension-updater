/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */


import * as https from 'https';
import * as fs from 'fs';
import { ExtensionContext, Uri, commands, window, ProgressLocation } from 'vscode';
import * as asyncTmp from './asynctmp';
import { sleep } from './utils';
import { compareVersions } from 'compare-versions';

/**
 * Info about the new package version.
 */
export interface ExtensionVersion {
    version: string;
    when: number;
    downloadUrl: Uri;
    /** labels/tags in the repository */
    tags?: string[];
}

/**
 * Extension `package.json` fields
 */
export interface ExtensionManifest {
    displayName: string;
    version: string;
}

export interface ExtensionUpdaterOptions {
    /** If `true`, a notification will be displayed when no new version is available. */
    showUpToDateConfirmation?: boolean;
    /** If `true`, the extension will re-install no matter which version is currently installed. */
    reInstall?: boolean;
}

/**
 * Checks for new version, downloads and installs.
 */
export abstract class ExtensionUpdater {

    /** Extension name + version. 
     * This is used for the name of the temporary downloaded .vsix file. */
    private extensionFullName: string;

    /** Extension's `package.json` */
    extensionManifest: ExtensionManifest;

    constructor(context: ExtensionContext, private options?: ExtensionUpdaterOptions) {
        this.extensionManifest = context.extension.packageJSON as ExtensionManifest;
        this.extensionFullName = this.extensionManifest.displayName + '-' + this.extensionManifest.version;
    }

    protected getExtensionManifest(): ExtensionManifest {
        return this.extensionManifest;
    }

    /**
     * Checks if new version is available, downloads and installs and reloads the window.
     */
    async getNewVersionAndInstall(): Promise<void> {

        // 1. check if new version is available
        const newVersion = await this.showProgress(`Checking for updates for ${this.extensionManifest.displayName}`, () =>
            this.getNewVersion());

        if (newVersion) {

            if (this.options?.reInstall || await this.consentToInstall(newVersion)) {
                // 2. download
                const vsixUri = await this.showProgress(`Downloading ${this.extensionManifest.displayName}`, () =>
                    this.download(newVersion.downloadUrl));

                // 3. install
                await this.showProgress(`Installing ${this.extensionManifest.displayName}`, () =>
                    this.install(vsixUri));

                // 4. reload
                if (await this.consentToReload()) {
                    await commands.executeCommand('workbench.action.reloadWindow');
                }
            }
        }
        else {
            const message = `No update found for '${this.extensionManifest.displayName}'`;
            console.log(message);
        }
    }

    /**
     * Installs VSIX package.
     * @param vsixUri local Uri path to the downloaded vsix package
     */
    protected async install(vsixUri: Uri): Promise<void> {
        await sleep(1000); // without this, the downloaded file appears to be corrupted

        console.log(`Installing extension from ${vsixUri}`);

        // as documented here: https://code.visualstudio.com/api/references/commands
        await commands.executeCommand('workbench.extensions.installExtension', vsixUri);

        console.log(`Done installing extension from ${vsixUri}`);
    }

    /**
     * Downloads the .vsix from the url
     * @param downloadUri url for the .vsix package download
     */
    protected async download(downloadUri: Uri): Promise<Uri> {
        console.log(`Downloading extension from ${downloadUri}`);
        const downloadedPath = await asyncTmp.file(0o644, this.extensionManifest.displayName, '.vsix');
        const localFile = fs.createWriteStream(downloadedPath.path);

        return new Promise<Uri>((resolve, reject) => {
            https.get(downloadUri.toString(),
                {
                },
                (resp) => {
                    if ((resp.statusCode ?? Number.MAX_VALUE) >= 300) {
                        console.error(`statusCode: ${resp.statusCode}`);
                        reject(new Error(`Download failed with status code: ${resp.statusCode}`));
                    }

                    // direct the downloaded bytes to the file
                    resp.pipe(localFile);

                    // The whole response has been received. Print out the result.
                    resp.on('close', () => {
                        console.log(`Done downloading extension package to ${downloadedPath.path}`);
                        localFile.close();
                        resolve(Uri.file(downloadedPath.path));
                    });
                }).on("error", (err) => {
                    console.error("Error: " + err.message);
                    reject(err);
                });
        });
    }

    /**
     * Determines whether a new version is available.
     * @returns new version, or `undefined`, if no new version is available
     */
    private async getNewVersion(): Promise<ExtensionVersion | undefined> {
        const latestVersion = await this.getVersion();
        const installedVersion = this.getCurrentVersion();

        const comparisonResult = compareVersions(latestVersion.version, installedVersion);
        if (this.options?.reInstall ||  comparisonResult === 1 ) {
            console.log("Newer version found..");
            return latestVersion;
        } else if (comparisonResult <= 0 && this.options?.showUpToDateConfirmation) {
            const message = `Extension up to date: '${this.extensionManifest.displayName} v${this.extensionManifest.version}'`;
            window.showInformationMessage(message);
            console.log("Extension up to date")
        }
        else {
            return undefined;
        }
    }

    protected abstract getVersion(): Promise<ExtensionVersion>;

    private showProgress<T>(message: string, payload: () => Thenable<T>): Thenable<T> {
        return window.withProgress({ location: ProgressLocation.Window, title: message }, payload);
    }

    private getCurrentVersion(): string {
        return this.extensionManifest.version;
    }

    /**
     * Requests user confirmation to download and install new version.
     * @param newVersion new version
     */
    private async consentToInstall(newVersion: ExtensionVersion): Promise<boolean> {
        const downloadAndInstall = 'Download and Install';
        const answer = await window.showInformationMessage(
            `New version ${newVersion.version} of '${this.extensionManifest.displayName}' is available.`,
            {}, downloadAndInstall, 'Later'
        );
        return answer === downloadAndInstall;
    }

    /**
     * Requests user confirmation to reload the window
     */
    private async consentToReload(): Promise<boolean> {
        const reload = 'Reload';
        const answer = await window.showInformationMessage(`New version of '${this.extensionManifest.displayName}' was installed.`,
            {}, reload, 'Later');
            
        return answer === reload;
    }
}
