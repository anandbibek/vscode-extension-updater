/* --------------------------------------------------------------------------------------------
 * Copyright (c) Ananda Bibek Ray 2023. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as https from 'https';
import { ExtensionContext, Uri } from 'vscode';
import { ExtensionUpdater, ExtensionUpdaterOptions, ExtensionVersion } from './ExtensionUpdater';

export interface GitlabOptions {
  /** Gitlab host e.g. `linux-git.mycorp.com` */
  gitlabHost: string;

  /** Gitlab project ID. Settings > General > Project ID */
  projectId: number;

  /** Gitlab package registry type . Ex: 'generic'*/
  packageType: string;

  /** Gitlab package registry package name. Ex: 'dev-builds'*/
  packageName: string;
}

/**
 * Downloads extension updates from a Gitlab Generic Package registry.
 * Here is documentation about the Gitlab Package REST API:
 * https://docs.gitlab.com/ee/api/packages.html
 */
export class GitLabExtensionUpdater extends ExtensionUpdater {
  
  /** Gitlab host e.g. `linux-git.mycorp.com` */
  private gitlabHost: string;

  /** Gitlab project ID. Settings > General > Project ID */
  private projectId: number;

  /** Gitlab package registry type . Ex: 'generic'*/
  private packageType: string;

  /** Gitlab package registry package name. Ex: 'dev-builds'*/
  private packageName: string;

  /**
   * Constructs the gitlab extension updater for the current extension.
   * @param context extension context
   * @param options gitlab options
   */
  constructor(context: ExtensionContext, options: GitlabOptions & ExtensionUpdaterOptions) {
      super(context, options);
      this.gitlabHost = options.gitlabHost;
      this.projectId = options.projectId;
      this.packageType = options.packageType;
      this.packageName = options.packageName;
  }

  private createVersionUrl(): string {
      return `https://${this.gitlabHost}/api/v4/projects/${this.projectId}/packages?sort=desc&status=default&order_by=version&package_name=${this.packageName}`;
  }

  private createDownloadUrl(packageName : string, version : string): string {
      return `https://${this.gitlabHost}/api/v4/projects/${this.projectId}/packages/${this.packageType}/${packageName}/${version}/${this.getFileName()}`;
  }

  /**
   * By default, this class uses the extension name (without version) and the `.vsix` suffix to locate the extension binaries in the list of Confluence attachments.
   * Override this logic, if you have a different naming convention.
   */
  protected getFileName(): string {
      return this.getExtensionManifest().name + '.vsix';
  }

  protected async getVersion(): Promise<ExtensionVersion> {

      const url = this.createVersionUrl();
      console.log(`Checking for new versions at ${url}`);

      return new Promise<ExtensionVersion>((resolve, reject) => {
          https.get(url,
              {
                  headers: {
                      "Accept": " application/json",
                  }
              },
              (resp) => {
                  let data = '';
                  // A chunk of data has been received.
                  resp.on('data', (chunk) => {
                      data += chunk;
                  });
                  // The whole response has been received. Print out the result.
                  resp.on('end', () => {
                      const results = JSON.parse(data);
                      if (results && results.length > 0) {
                          const result0 = results[0];
                          const version = result0["version"]
                          const when = Date.parse(result0["created_at"]);
                          const name = result0["name"];
                          const downloadUrl = Uri.parse(this.createDownloadUrl(name, version));
                          const tags: string[] = result0['tags'];
                          resolve({ version, when, downloadUrl, tags: tags });
                      }
                      else {
                          console.dir(results);
                          reject(new Error(`Unexpected response from Confluence. Full response is in the console/log.`));
                      }
                  });
              }).on("error", (err) => {
                  console.error("Error: " + err.message);
                  reject(err);
              });
      });
  }
  
}