import { App, Notice, Platform, Plugin, PluginSettingTab, Setting } from "obsidian";

const MODE_BOTH = "both" as const;
const MODE_DESKTOP = "desktop" as const;
const MODE_MOBILE = "mobile" as const;
const MODE_DISABLED = "disabled" as const;

type AssignmentMode =
	| typeof MODE_BOTH
	| typeof MODE_DESKTOP
	| typeof MODE_MOBILE
	| typeof MODE_DISABLED;

type ApplyMode = "session" | "persistent";
type SortMode = "name" | "id" | "status";

interface DevicePluginSwitcherSettings {
	version: number;
	assignments: Record<string, AssignmentMode>;
	protectedPluginIds: string[];
	applyMode: ApplyMode;
	autoApplyOnStartup: boolean;
	applyDelayMs: number;
	sortBy: SortMode;
}

interface InstalledPluginRow {
	id: string;
	name: string;
	version: string;
	description: string;
	isDesktopOnly: boolean;
	enabled: boolean;
	protected: boolean;
}

interface InternalPluginManifest {
	id: string;
	name?: string;
	version?: string;
	description?: string;
	isDesktopOnly?: boolean;
}

interface InternalPluginManager {
	manifests?: Record<string, InternalPluginManifest> | Map<string, InternalPluginManifest>;
	enabledPlugins?: Set<string>;
	plugins?: Record<string, unknown>;
	enablePlugin?: (pluginId: string) => Promise<void> | void;
	disablePlugin?: (pluginId: string) => Promise<void> | void;
	enablePluginAndSave?: (pluginId: string) => Promise<void> | void;
	disablePluginAndSave?: (pluginId: string) => Promise<void> | void;
	saveEnabledPlugins?: () => Promise<void> | void;
}

const BRAND_LOGO_SVG = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
<circle cx="128" cy="128" r="120" fill="none" stroke="#000" stroke-width="6"/>
<path d="m128 8a120 120 0 0 0 0 240 60 60 0 0 1 0-120 60 60 0 0 0 0-120z" fill="#fff"/>
<path d="m128 8a120 120 0 0 1 0 240 60 60 0 0 1 0-120 60 60 0 0 0 0-120z"/>
<rect x="70" y="50" width="60" height="40" rx="4"/>
<rect x="95" y="92" width="10" height="8"/>
<rect x="140" y="150" width="36" height="60" rx="6" fill="#fff" stroke="#000" stroke-width="2"/>
<circle cx="158" cy="204" r="3"/>
</svg>`;

const DEFAULT_SETTINGS: DevicePluginSwitcherSettings = {
	version: 3,
	assignments: {},
	protectedPluginIds: ["device-plugin-switcher"],
	applyMode: "session",
	autoApplyOnStartup: true,
	applyDelayMs: 1500,
	sortBy: "name",
};

function isAssignmentMode(value: unknown): value is AssignmentMode {
	return value === MODE_BOTH || value === MODE_DESKTOP || value === MODE_MOBILE || value === MODE_DISABLED;
}

export default class DevicePluginSwitcherPlugin extends Plugin {
	settings: DevicePluginSwitcherSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		await this.initializeMissingAssignments(true);

		this.addSettingTab(new DevicePluginSwitcherSettingTab(this.app, this));

		this.addCommand({
			id: "apply-device-plugin-switcher",
			name: "Apply current device plugin state",
			callback: async () => this.applyDeviceState({ manual: true }),
		});

		this.addCommand({
			id: "open-device-plugin-switcher-settings",
			name: "Open Device Extensions Switcher settings",
			callback: () => {
				const appWithSetting = this.app as unknown as { setting?: { openTabById?: (id: string) => void } };
				appWithSetting.setting?.openTabById?.(this.manifest.id);
			},
		});

		if (this.settings.autoApplyOnStartup) {
			const delay = Number(this.settings.applyDelayMs || 1500);
			const timeout = window.setTimeout(() => {
				void this.applyDeviceState({ manual: false });
			}, delay);
			this.register(() => window.clearTimeout(timeout));
		}
	}

	async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) as Partial<DevicePluginSwitcherSettings> | null;
		const safeLoaded = loaded || {};
		const selfId = this.manifest?.id || "device-plugin-switcher";

		this.settings = {
			...DEFAULT_SETTINGS,
			...safeLoaded,
			assignments: {
				...DEFAULT_SETTINGS.assignments,
				...(safeLoaded.assignments || {}),
			},
			// Hidden defaults: keep the plugin simple and safe for synced .obsidian setups.
			applyMode: "session",
			autoApplyOnStartup: true,
			applyDelayMs: 1500,
			protectedPluginIds: [selfId],
		};
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	getDeviceLabel(): "mobile" | "desktop" | "unknown" {
		if (Platform.isMobile) return "mobile";
		if (Platform.isDesktop) return "desktop";
		return "unknown";
	}

	getPluginManager(): InternalPluginManager {
		return (this.app as unknown as { plugins: InternalPluginManager }).plugins;
	}

	getInstalledPlugins(): InstalledPluginRow[] {
		const manager = this.getPluginManager();
		const manifests = manager?.manifests || {};
		const values = manifests instanceof Map ? Array.from(manifests.values()) : Object.values(manifests);

		const selfId = this.manifest?.id || "device-plugin-switcher";
		const rows = values
			.filter((manifest): manifest is InternalPluginManifest => Boolean(manifest?.id) && manifest.id !== selfId)
			.map((manifest) => ({
				id: manifest.id,
				name: manifest.name || manifest.id,
				version: manifest.version || "",
				description: manifest.description || "",
				isDesktopOnly: Boolean(manifest.isDesktopOnly),
				enabled: this.isPluginEnabled(manifest.id),
				protected: this.isProtectedPlugin(manifest.id),
			}));

		const sortBy = this.settings.sortBy || "name";
		rows.sort((a, b) => {
			if (sortBy === "id") return a.id.localeCompare(b.id);
			if (sortBy === "status") return Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name);
			return a.name.localeCompare(b.name);
		});

		return rows;
	}

	isPluginEnabled(pluginId: string): boolean {
		const manager = this.getPluginManager();

		if (manager?.enabledPlugins?.has(pluginId)) return true;
		if (manager?.plugins && Object.prototype.hasOwnProperty.call(manager.plugins, pluginId)) return true;

		return false;
	}

	isProtectedPlugin(pluginId: string): boolean {
		const protectedIds = new Set(this.settings.protectedPluginIds || []);
		protectedIds.add(this.manifest?.id || "device-plugin-switcher");
		return protectedIds.has(pluginId);
	}

	getAssignment(plugin: InstalledPluginRow): AssignmentMode {
		const existing = this.settings.assignments?.[plugin.id];
		if (isAssignmentMode(existing)) return existing;
		if (plugin.isDesktopOnly) return MODE_DESKTOP;
		return plugin.enabled ? MODE_BOTH : MODE_DISABLED;
	}

	async initializeMissingAssignments(save: boolean): Promise<void> {
		const plugins = this.getInstalledPlugins();
		let changed = false;

		for (const plugin of plugins) {
			if (!this.settings.assignments[plugin.id]) {
				this.settings.assignments[plugin.id] = this.getAssignment(plugin);
				changed = true;
			}
		}

		const selfId = this.manifest?.id || "device-plugin-switcher";
		if (!this.settings.protectedPluginIds.includes(selfId)) {
			this.settings.protectedPluginIds.push(selfId);
			changed = true;
		}
		this.settings.assignments[selfId] = MODE_BOTH;

		if (changed && save) await this.saveSettings();
	}

	getDesiredEnabledSet(): Set<string> {
		const desired = new Set<string>();
		const plugins = this.getInstalledPlugins();
		const isMobile = Platform.isMobile;
		const isDesktop = Platform.isDesktop;

		for (const plugin of plugins) {
			const id = plugin.id;
			const mode = this.getAssignment(plugin);

			if (this.isProtectedPlugin(id)) {
				desired.add(id);
				continue;
			}

			if (plugin.isDesktopOnly && isMobile) continue;

			if (mode === MODE_BOTH) desired.add(id);
			else if (mode === MODE_DESKTOP && isDesktop) desired.add(id);
			else if (mode === MODE_MOBILE && isMobile) desired.add(id);
		}

		return desired;
	}

	getApplyPlan(): { desired: Set<string>; enable: string[]; disable: string[]; keep: string[]; plugins: InstalledPluginRow[] } {
		const desired = this.getDesiredEnabledSet();
		const plugins = this.getInstalledPlugins();
		const enable: string[] = [];
		const disable: string[] = [];
		const keep: string[] = [];

		for (const plugin of plugins) {
			if (desired.has(plugin.id)) {
				if (plugin.enabled) keep.push(plugin.id);
				else enable.push(plugin.id);
			} else if (plugin.enabled && !this.isProtectedPlugin(plugin.id)) {
				disable.push(plugin.id);
			}
		}

		return { desired, enable, disable, keep, plugins };
	}

	async enablePlugin(pluginId: string): Promise<void> {
		const manager = this.getPluginManager();
		if (this.isPluginEnabled(pluginId)) return;

		if (this.settings.applyMode === "persistent" && typeof manager?.enablePluginAndSave === "function") {
			await manager.enablePluginAndSave(pluginId);
			return;
		}

		if (typeof manager?.enablePlugin === "function") {
			await manager.enablePlugin(pluginId);
			if (this.settings.applyMode === "persistent" && typeof manager?.saveEnabledPlugins === "function") {
				await manager.saveEnabledPlugins();
			}
			return;
		}

		throw new Error("Obsidian plugin manager does not expose enablePlugin().");
	}

	async disablePlugin(pluginId: string): Promise<void> {
		const manager = this.getPluginManager();
		if (!this.isPluginEnabled(pluginId)) return;
		if (this.isProtectedPlugin(pluginId)) return;

		if (this.settings.applyMode === "persistent" && typeof manager?.disablePluginAndSave === "function") {
			await manager.disablePluginAndSave(pluginId);
			return;
		}

		if (typeof manager?.disablePlugin === "function") {
			await manager.disablePlugin(pluginId);
			if (this.settings.applyMode === "persistent" && typeof manager?.saveEnabledPlugins === "function") {
				await manager.saveEnabledPlugins();
			}
			return;
		}

		throw new Error("Obsidian plugin manager does not expose disablePlugin().");
	}

	async applyDeviceState({ manual }: { manual: boolean } = { manual: false }): Promise<{ plan: ReturnType<DevicePluginSwitcherPlugin["getApplyPlan"]>; errors: string[] }> {
		await this.initializeMissingAssignments(true);
		const plan = this.getApplyPlan();
		const errors: string[] = [];

		for (const pluginId of plan.enable) {
			try {
				await this.enablePlugin(pluginId);
			} catch (error) {
				console.error(`[Device Extensions Switcher] Failed to enable ${pluginId}`, error);
				errors.push(`enable ${pluginId}: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		for (const pluginId of plan.disable) {
			try {
				await this.disablePlugin(pluginId);
			} catch (error) {
				console.error(`[Device Extensions Switcher] Failed to disable ${pluginId}`, error);
				errors.push(`disable ${pluginId}: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		if (manual || errors.length > 0) {
			const device = this.getDeviceLabel();
			if (errors.length > 0) {
				new Notice(`Device Extensions Switcher: applied with ${errors.length} error(s). Check console.`);
			} else {
				new Notice(`Device Extensions Switcher: ${device} device state applied. Enabled ${plan.enable.length}, disabled ${plan.disable.length}.`);
			}
		}

		return { plan, errors };
	}

	async setAssignment(pluginId: string, mode: AssignmentMode): Promise<void> {
		if (!isAssignmentMode(mode)) return;
		this.settings.assignments[pluginId] = mode;
		await this.saveSettings();
	}

	async resetAssignmentsFromCurrentState(): Promise<void> {
		const plugins = this.getInstalledPlugins();
		this.settings.assignments = {};
		const selfId = this.manifest?.id || "device-plugin-switcher";

		for (const plugin of plugins) {
			if (plugin.id === selfId) this.settings.assignments[plugin.id] = MODE_BOTH;
			else if (plugin.isDesktopOnly) this.settings.assignments[plugin.id] = plugin.enabled ? MODE_DESKTOP : MODE_DISABLED;
			else this.settings.assignments[plugin.id] = plugin.enabled ? MODE_BOTH : MODE_DISABLED;
		}

		await this.saveSettings();
	}

	async copyInstalledIdsToClipboard(): Promise<void> {
		const plugins = this.getInstalledPlugins();
		const text = plugins.map((plugin) => `${plugin.id}    # ${plugin.name}`).join("\n");
		await navigator.clipboard.writeText(text);
		new Notice("Installed plugin IDs copied to clipboard.");
	}
}

class DevicePluginSwitcherSettingTab extends PluginSettingTab {
	plugin: DevicePluginSwitcherPlugin;
	searchText = "";
	tableMount: HTMLElement | null = null;

	constructor(app: App, plugin: DevicePluginSwitcherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private renderBrandHeader(containerEl: HTMLElement): void {
		const brand = containerEl.createDiv({ cls: "dps-brand" });
		const brandMedia = brand.createDiv({ cls: "dps-brand-media" });
		const logo = brandMedia.createDiv({ cls: "dps-brand-logo", attr: { "aria-hidden": "true" } });
		logo.innerHTML = BRAND_LOGO_SVG;

		const brandCopy = brand.createDiv({ cls: "dps-brand-copy" });
		brandCopy.createEl("div", { text: "Device Extensions Switcher", cls: "dps-brand-title" });
		brandCopy.createEl("div", { text: "Simply switch. Nothing else.", cls: "dps-brand-tagline" });
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("dps-settings");

		this.renderBrandHeader(containerEl);

		const device = this.plugin.getDeviceLabel();
		const intro = containerEl.createDiv({ cls: "dps-intro" });
		intro.createEl("p", {
			text: `Current device: ${device}. Choose where each installed community plugin should be active. Changes are applied immediately on this device.`,
		});
		intro.createEl("p", {
			text: "Both = desktop and mobile. Desktop only = disabled on mobile. Mobile only = disabled on desktop. Disabled = disabled everywhere unless protected.",
		});

		const syncNote = containerEl.createDiv({ cls: "dps-sync-note" });
		syncNote.createEl("strong", { text: "Sync prerequisite: " });
		syncNote.createEl("span", {
			text: "This plugin does not sync settings by itself. To use the same assignment table on desktop and mobile, sync your .obsidian configuration/plugin settings between devices.",
		});

		containerEl.createEl("h3", { text: "Plugin assignment table" });

		new Setting(containerEl)
			.setName("Search plugins")
			.setDesc("Filter by plugin name or ID.")
			.addText((text) => {
				text
					.setPlaceholder("dataview, templater, git...")
					.setValue(this.searchText)
					.onChange((value) => {
						this.searchText = value.trim().toLowerCase();
						this.renderTable();
					});
			});

		this.tableMount = containerEl.createDiv({ cls: "dps-table-mount" });
		this.renderTable();

		containerEl.createEl("h3", { text: "Table options" });

		new Setting(containerEl)
			.setName("Refresh plugin list")
			.setDesc("Reload the installed plugin list without resetting your selected modes.")
			.addButton((button) => {
				button
					.setButtonText("Refresh")
					.onClick(async () => {
						await this.plugin.initializeMissingAssignments(true);
						this.display();
					});
			});

		new Setting(containerEl)
			.setName("Sort table by")
			.setDesc("Controls the plugin table order.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("name", "Name")
					.addOption("id", "Plugin ID")
					.addOption("status", "Current status")
					.setValue(this.plugin.settings.sortBy || "name")
					.onChange(async (value) => {
						this.plugin.settings.sortBy = value as SortMode;
						await this.plugin.saveSettings();
						this.display();
					});
			});
	}

	renderTable(): void {
		if (!this.tableMount) return;
		this.tableMount.empty();

		const allPlugins = this.plugin.getInstalledPlugins();
		const query = this.searchText;
		const plugins = query
			? allPlugins.filter((plugin) => plugin.name.toLowerCase().includes(query) || plugin.id.toLowerCase().includes(query))
			: allPlugins;

		const summary = this.tableMount.createDiv({ cls: "dps-summary" });
		const counts = this.getCounts(allPlugins);
		summary.setText(`Installed: ${allPlugins.length} · Both: ${counts.both} · Desktop only: ${counts.desktop} · Mobile only: ${counts.mobile} · Disabled: ${counts.disabled}`);

		const isMobileUi = Platform.isMobile;
		const wrapper = this.tableMount.createDiv({ cls: `dps-table-wrapper ${isMobileUi ? "dps-table-wrapper-mobile" : "dps-table-wrapper-desktop"}` });
		const table = wrapper.createEl("table", { cls: `dps-table ${isMobileUi ? "dps-table-mobile" : "dps-table-desktop"}` });

		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");
		const labels = isMobileUi ? ["Plugin", "Current", "Mode"] : ["Plugin", "Current", "Both", "Desktop only", "Mobile only", "Disabled"];
		labels.forEach((label) => {
			headerRow.createEl("th", { text: label });
		});

		const tbody = table.createEl("tbody");

		for (const plugin of plugins) {
			const row = tbody.createEl("tr");
			if (plugin.protected) row.addClass("dps-row-protected");
			if (!plugin.enabled) row.addClass("dps-row-disabled-now");

			const pluginCell = row.createEl("td", { cls: "dps-plugin-cell" });
			pluginCell.createEl("div", { text: plugin.name, cls: "dps-plugin-name" });
			pluginCell.createEl("div", { text: plugin.id, cls: "dps-plugin-id" });

			const badges = pluginCell.createDiv({ cls: "dps-badges" });
			if (plugin.version) badges.createSpan({ text: `v${plugin.version}`, cls: "dps-badge" });
			if (plugin.isDesktopOnly) badges.createSpan({ text: "desktop-only manifest", cls: "dps-badge dps-warning" });
			if (plugin.protected) badges.createSpan({ text: "protected", cls: "dps-badge dps-protected" });

			row.createEl("td", {
				text: plugin.enabled ? "Enabled" : "Disabled",
				cls: plugin.enabled ? "dps-current-enabled" : "dps-current-disabled",
			});

			if (isMobileUi) {
				this.addModeSelectCell(row, plugin);
			} else {
				this.addModeCell(row, plugin, MODE_BOTH);
				this.addModeCell(row, plugin, MODE_DESKTOP);
				this.addModeCell(row, plugin, MODE_MOBILE, plugin.isDesktopOnly);
				this.addModeCell(row, plugin, MODE_DISABLED);
			}
		}

		if (plugins.length === 0) {
			const empty = this.tableMount.createDiv({ cls: "dps-empty" });
			empty.setText("No plugins match the current search.");
		}
	}

	async changeAssignment(pluginId: string, mode: AssignmentMode): Promise<void> {
		await this.plugin.setAssignment(pluginId, mode);
		await this.plugin.applyDeviceState({ manual: false });
		this.renderTable();
	}

	addModeCell(row: HTMLTableRowElement, plugin: InstalledPluginRow, mode: AssignmentMode, disabled = false): void {
		const isSelected = this.plugin.getAssignment(plugin) === mode;
		const cell = row.createEl("td", {
			cls: `dps-mode-cell${disabled ? " dps-mode-cell-disabled" : ""}${isSelected ? " dps-mode-cell-selected" : ""}`,
		});
		const input = cell.createEl("input", { type: "radio" });
		input.name = `dps-mode-${plugin.id}`;
		input.value = mode;
		input.checked = isSelected;
		input.disabled = disabled || (plugin.protected && mode === MODE_DISABLED);
		input.addEventListener("change", async () => {
			if (!input.checked) return;
			await this.changeAssignment(plugin.id, mode);
		});

	}

	addModeSelectCell(row: HTMLTableRowElement, plugin: InstalledPluginRow): void {
		const cell = row.createEl("td", { cls: "dps-mode-select-cell" });
		const select = cell.createEl("select", { cls: "dps-mode-select" });

		const options: Array<[AssignmentMode, string]> = [
			[MODE_BOTH, "Both"],
			[MODE_DESKTOP, "Desktop only"],
			[MODE_MOBILE, "Mobile only"],
			[MODE_DISABLED, "Disabled"],
		];

		for (const [value, label] of options) {
			const option = select.createEl("option", { text: label, value });
			if (plugin.isDesktopOnly && value === MODE_MOBILE) {
				option.disabled = true;
			}
			if (plugin.protected && value === MODE_DISABLED) {
				option.disabled = true;
			}
		}

		select.value = this.plugin.getAssignment(plugin);
		select.addEventListener("change", async () => {
			const mode = select.value;
			if (!isAssignmentMode(mode)) return;
			select.disabled = true;
			await this.changeAssignment(plugin.id, mode);
		});
	}

	getCounts(plugins: InstalledPluginRow[]): Record<AssignmentMode, number> {
		const counts: Record<AssignmentMode, number> = { both: 0, desktop: 0, mobile: 0, disabled: 0 };
		for (const plugin of plugins) counts[this.plugin.getAssignment(plugin)] += 1;
		return counts;
	}
}
