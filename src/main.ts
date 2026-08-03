import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl } from 'obsidian';
import { extractUrl, targetName, targetPath, cleanTitle } from './title';
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
  async scan() { const files = this.app.vault.getMarkdownFiles(); const counts = { renamed: 0, skipped: 0, failed: 0 }; for (const file of files) { const result = await this.rename(file); if (result === 'renamed') counts.renamed++; else if (result === 'failed') counts.failed++; else if (result === 'skipped') counts.skipped++; } new Notice(`Link Title scan: ${counts.renamed} renamed, ${counts.skipped} skipped, ${counts.failed} failed.`); }
  private async rename(file: TFile): Promise<'renamed' | 'skipped' | 'failed'> { const body = await this.app.vault.read(file); const url = extractUrl(body); if (!url) return 'skipped'; let title: string; try { title = await fetchTitle(url, this.settings.timeoutMs); } catch (error) { console.warn(`Obsidian Link Title: could not fetch title for ${file.path} (${url})`, error); new Notice(`Skipped ${file.path}: could not fetch page title.`); return 'failed'; } const desired = targetName(url, title); if (!desired || desired === file.basename) return 'skipped'; const destination = targetPath(file.path, desired); const existing = this.app.vault.getAbstractFileByPath(destination); if (existing && existing !== file) { new Notice(`Skipped ${file.path}: destination already exists.`); return 'skipped'; } try { await this.app.fileManager.renameFile(file, destination); return 'renamed'; } catch (error) { console.warn(`Obsidian Link Title: rename failed for ${file.path} -> ${destination}`, error); new Notice(`Failed to rename ${file.path}: ${error instanceof Error ? error.message : 'unknown error'}.`); return 'failed'; } }
}
class LinkTitleSettingTab extends PluginSettingTab { plugin: LinkTitlePlugin; constructor(app: App, plugin: LinkTitlePlugin) { super(app, plugin); this.plugin = plugin; } display() { this.containerEl.empty(); new Setting(this.containerEl).setName('Request timeout (ms)').addText(t => t.setValue(String(this.plugin.settings.timeoutMs)).onChange(async v => { const n = Number(v); if (Number.isFinite(n) && n >= 1000) { this.plugin.settings.timeoutMs = n; await this.plugin.saveData(this.plugin.settings); } })); new Setting(this.containerEl).setName('Scan').setDesc('Renaming is explicit only and never runs automatically.').addButton(b => b.setButtonText('Scan and rename now').setCta().onClick(() => void this.plugin.scan())); } }
