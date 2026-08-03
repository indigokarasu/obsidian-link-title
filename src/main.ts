import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl } from 'obsidian';
import { extractUrl, targetName, cleanTitle } from './title';
interface Settings { timeoutMs: number; }
const DEFAULT: Settings = { timeoutMs: 10000 };

async function fetchTitle(url: string, timeoutMs: number): Promise<string> {
  const response = await Promise.race([requestUrl({ url, method: 'GET', headers: { Accept: 'text/html,application/xhtml+xml' } }), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))]);
  const contentType = (response.headers['content-type'] || response.headers['Content-Type'] || '').toLowerCase();
  if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) throw new Error('not HTML');
  const match = response.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match ? cleanTitle(match[1].replace(/<[^>]+>/g, '')) : '';
  if (!title) throw new Error('title unavailable');
  return title;
}
export default class LinkTitlePlugin extends Plugin {
  settings: Settings = DEFAULT;
  async onload() { this.settings = Object.assign({}, DEFAULT, await this.loadData()); this.addCommand({ id: 'rename-url-only-notes', name: 'Rename URL-only notes', callback: () => void this.scan() }); this.addSettingTab(new LinkTitleSettingTab(this.app, this)); }
  async scan() { const files = this.app.vault.getMarkdownFiles(); let renamed = 0; for (const file of files) { if (await this.rename(file)) renamed++; } new Notice(`Renamed ${renamed} note${renamed === 1 ? '' : 's'}.`); }
  private async rename(file: TFile): Promise<boolean> { const body = await this.app.vault.read(file); const url = extractUrl(body); if (!url) return false; let title: string; try { title = await fetchTitle(url, this.settings.timeoutMs); } catch (error) { console.warn('Obsidian Link Title:', error); return false; } const desired = targetName(url, title); if (!desired || desired === file.basename) return false; const existing = this.app.vault.getAbstractFileByPath(`${desired}.md`); if (existing && existing !== file) return false; try { await this.app.fileManager.renameFile(file, `${desired}.md`); return true; } catch (error) { console.warn('Obsidian Link Title rename failed:', error); return false; } }
}
class LinkTitleSettingTab extends PluginSettingTab { plugin: LinkTitlePlugin; constructor(app: App, plugin: LinkTitlePlugin) { super(app, plugin); this.plugin = plugin; } display() { this.containerEl.empty(); new Setting(this.containerEl).setName('Request timeout (ms)').addText(t => t.setValue(String(this.plugin.settings.timeoutMs)).onChange(async v => { const n = Number(v); if (Number.isFinite(n) && n >= 1000) { this.plugin.settings.timeoutMs = n; await this.plugin.saveData(this.plugin.settings); } })); new Setting(this.containerEl).setName('Scan').setDesc('Renaming is explicit only and never runs automatically.').addButton(b => b.setButtonText('Scan and rename now').setCta().onClick(() => void this.plugin.scan())); } }
