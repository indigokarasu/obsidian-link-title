"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LinkTitlePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/title.ts
function extractUrl(body) {
  const value = body.trim();
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch (e) {
    return null;
  }
}
function hostname(url) {
  const host = new URL(url).hostname.toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
}
function cleanTitle(value) {
  return value.replace(/\s+/g, " ").replace(/[\/\\:#?%*|<>"\x00-\x1f]/g, " ").trim().replace(/\s+/g, " ").slice(0, 180);
}
function targetName(url, title) {
  return `${hostname(url)} \u2014 ${cleanTitle(title)}`;
}

// src/main.ts
var DEFAULT = { timeoutMs: 1e4 };
async function fetchTitle(url, timeoutMs) {
  const response = await Promise.race([(0, import_obsidian.requestUrl)({ url, method: "GET", headers: { Accept: "text/html,application/xhtml+xml" } }), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs))]);
  const contentType = (response.headers["content-type"] || response.headers["Content-Type"] || "").toLowerCase();
  if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("not HTML");
  const match = response.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match ? cleanTitle(match[1].replace(/<[^>]+>/g, "")) : "";
  if (!title) throw new Error("title unavailable");
  return title;
}
var LinkTitlePlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT;
  }
  async onload() {
    this.settings = Object.assign({}, DEFAULT, await this.loadData());
    this.addCommand({ id: "rename-url-only-notes", name: "Rename URL-only notes", callback: () => void this.scan() });
    this.addSettingTab(new LinkTitleSettingTab(this.app, this));
  }
  async scan() {
    const files = this.app.vault.getMarkdownFiles();
    let renamed = 0;
    for (const file of files) {
      if (await this.rename(file)) renamed++;
    }
    new import_obsidian.Notice(`Renamed ${renamed} note${renamed === 1 ? "" : "s"}.`);
  }
  async rename(file) {
    const body = await this.app.vault.read(file);
    const url = extractUrl(body);
    if (!url) return false;
    let title;
    try {
      title = await fetchTitle(url, this.settings.timeoutMs);
    } catch (error) {
      console.warn("Obsidian Link Title:", error);
      return false;
    }
    const desired = targetName(url, title);
    if (!desired || desired === file.basename) return false;
    const existing = this.app.vault.getAbstractFileByPath(`${desired}.md`);
    if (existing && existing !== file) return false;
    try {
      await this.app.fileManager.renameFile(file, `${desired}.md`);
      return true;
    } catch (error) {
      console.warn("Obsidian Link Title rename failed:", error);
      return false;
    }
  }
};
var LinkTitleSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.containerEl.empty();
    new import_obsidian.Setting(this.containerEl).setName("Request timeout (ms)").addText((t) => t.setValue(String(this.plugin.settings.timeoutMs)).onChange(async (v) => {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 1e3) {
        this.plugin.settings.timeoutMs = n;
        await this.plugin.saveData(this.plugin.settings);
      }
    }));
    new import_obsidian.Setting(this.containerEl).setName("Scan").setDesc("Renaming is explicit only and never runs automatically.").addButton((b) => b.setButtonText("Scan and rename now").setCta().onClick(() => void this.plugin.scan()));
  }
};
