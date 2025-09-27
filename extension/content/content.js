// Prevent multiple content script injections
if (window.pickachuContentScriptLoaded) {
  console.log('Pickachu content script already loaded, skipping...');
} else {
  window.pickachuContentScriptLoaded = true;

// Prevent multiple injections
if (!window.__pickachuIconLoader) {
  window.__pickachuIconLoader = {
    promise: null,
    async load() {
      try {
        if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) {
          return null;
        }
        if (!this.promise) {
          this.promise = import(chrome.runtime.getURL('modules/icons.js')).catch(error => {
            console.debug('Failed to load icon module', error);
            this.promise = null;
            return null;
          });
        }
        return await this.promise;
      } catch (error) {
        console.debug('Icon module loader failed', error);
        this.promise = null;
        return null;
      }
    }
  };
}

if (window.pickachuInitialized) {
  console.log('Pickachu already initialized, skipping...');
} else {
  window.pickachuInitialized = true;

  const getIconsModule = () => window.__pickachuIconLoader.load();

  let activeModule = null;
  const modules = {};

  async function loadModule(name) {
    if (modules[name]) return modules[name];
    
    try {
      const url = chrome.runtime.getURL(`modules/${name}.js`);
      const mod = await import(url);
      modules[name] = mod;
      return mod;
    } catch (error) {
      console.error('Pickachu: Failed to load module', name, error);
      throw error;
    }
  }

  function resetActiveModule() {
    if (activeModule && activeModule.deactivate) {
      try {
        activeModule.deactivate();
      } catch (error) {
        console.error('Pickachu: Error deactivating module:', error);
      }
    }
    activeModule = null;
    document.body.style.cursor = '';
  }


  // Signal that content script is ready
  function signalReady() {
    // Send ready signal to background script
    chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }).catch(() => {
      // Ignore errors if background script is not available
    });
  }

  // Show Pickachu overlay when keyboard shortcut is used
  async function showPickachuOverlay() {
    // Remove existing overlay if any
    const existingOverlay = document.getElementById('pickachu-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    const icons = await getIconsModule();
    const getSvg = (name, size = 18) => {
      try {
        if (icons?.getIconSvg) {
          const svgString = icons.getIconSvg(name, { size });
          const div = document.createElement('div');
          div.innerHTML = svgString;
          return div.firstChild;
        }
      } catch (error) {
        console.debug('Failed to render icon', name, error);
      }
      return null;
    };
    
    const overlay = document.createElement('div');
    overlay.id = 'pickachu-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2147483646;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: pickachu-fade-in 0.3s ease-out;
    `;
    
    const popup = document.createElement('div');
    popup.style.cssText = `
      background: var(--pickachu-bg, #fff);
      border: 1px solid var(--pickachu-border, #ddd);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      color: var(--pickachu-text, #333);
      min-width: 300px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 20px;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; flex-direction: column; gap: 10px; align-items: center;';

    const title = document.createElement('h2');
    title.style.cssText = 'margin: 0; color: var(--pickachu-text, #333); display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 600;';
    const logoIcon = getSvg('star', 20);
    if (logoIcon) {
      title.appendChild(logoIcon);
    }
    title.appendChild(Object.assign(document.createElement('span'), { textContent: 'Pickachu' }));

    const subtitle = document.createElement('p');
    subtitle.style.cssText = 'margin: 0; color: var(--pickachu-secondary-text, #666); font-size: 14px;';
    subtitle.textContent = 'Use the extension icon in your toolbar to access every tool instantly.';

    header.appendChild(title);
    header.appendChild(subtitle);
    popup.appendChild(header);

    const featureGrid = document.createElement('div');
    featureGrid.style.cssText = 'display: grid; grid-template-columns: repeat(2, minmax(120px, 160px)); gap: 12px; justify-content: center;';
    const features = [
      { icon: 'color', label: 'Color Picker' },
      { icon: 'text', label: 'Text Picker' },
      { icon: 'element', label: 'Element Picker' },
      { icon: 'screenshot', label: 'Screenshot' }
    ];

    features.forEach(({ icon, label }) => {
      const card = document.createElement('div');
      card.style.cssText = 'padding: 14px; background: var(--pickachu-code-bg, #f8f9fa); border-radius: 10px; border: 1px solid var(--pickachu-border, #ddd); display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--pickachu-text, #333);';
      const iconHolder = document.createElement('div');
      iconHolder.style.cssText = 'width: 32px; height: 32px; border-radius: 12px; background: rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center;';
      const iconSvg = getSvg(icon, 18);
      if (iconSvg) {
        iconHolder.appendChild(iconSvg);
      }
      card.appendChild(iconHolder);
      card.appendChild(Object.assign(document.createElement('div'), { textContent: label }));
      featureGrid.appendChild(card);
    });

    popup.appendChild(featureGrid);

    const closeButton = document.createElement('button');
    closeButton.id = 'close-pickachu-overlay';
    closeButton.type = 'button';
    closeButton.style.cssText = 'margin: 0 auto; padding: 10px 20px; border: 1px solid var(--pickachu-border, #ddd); background: var(--pickachu-button-bg, #f0f0f0); border-radius: 999px; cursor: pointer; font-size: 14px; color: var(--pickachu-text, #333); display: inline-flex; align-items: center; gap: 8px; font-weight: 600;';
    const closeIconSvg = getSvg('close', 16);
    if (closeIconSvg) {
      closeButton.appendChild(closeIconSvg);
    }
    closeButton.appendChild(Object.assign(document.createElement('span'), { textContent: 'Close' }));
    popup.appendChild(closeButton);
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Add event listeners
    document.getElementById('close-pickachu-overlay').addEventListener('click', () => {
      overlay.remove();
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
    
    // Close on Escape key
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }

  chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (msg.type === 'ACTIVATE_TOOL_ON_PAGE') {
      try {
        resetActiveModule();
        
        const moduleName = msg.tool.replace(/-([a-z])/g, (_,c)=>c.toUpperCase());
        console.log('Pickachu: Activating tool:', moduleName);
        
        const mod = await loadModule(moduleName);
        if (mod && mod.activate) {
          activeModule = mod;
          mod.activate(resetActiveModule);
          console.log('Pickachu: Tool activated successfully:', moduleName);
        } else {
          console.error('Pickachu: Module does not have activate function:', moduleName);
        }
      } catch(e){
        console.error('Pickachu: Failed to activate tool', msg.tool, e);
      }
    } else if (msg.type === 'GET_PAGE_INFO') {
      // For screenshot tool - unified page info
      const pageInfo = {
        width: Math.max(
          document.body.scrollWidth,
          document.body.offsetWidth,
          document.documentElement.clientWidth,
          document.documentElement.scrollWidth,
          document.documentElement.offsetWidth
        ),
        height: Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        ),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        title: document.title,
        url: window.location.href,
        timestamp: Date.now()
      };
      sendResponse(pageInfo);
    } else if (msg.type === 'SHOW_PICKACHU_POPUP') {
      // Show popup overlay when keyboard shortcut is used
      showPickachuOverlay();
    } else if (msg.type === 'SHOW_FAVORITES') {
      // Show favorites modal
      import(chrome.runtime.getURL('modules/helpers.js')).then(helpers => {
        helpers.showFavorites();
      }).catch(error => {
        console.error('Failed to load helpers for favorites:', error);
      });
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      resetActiveModule();
    }
  });

  // Auto-load sticky notes for current site
  async function autoLoadStickyNotes() {
    try {
      const currentUrl = window.location.href;
      if (!currentUrl) return;

      const helpersModule = await import(chrome.runtime.getURL('modules/helpers.js'));
      const normalizeUrlForStorage = helpersModule?.normalizeUrlForStorage || ((url) => url || '');
      const sanitizedLegacy = helpersModule?.sanitizeInput || ((value) => value || '');

      const normalizedCurrentUrl = normalizeUrlForStorage(currentUrl);
      const siteKey = `stickyNotes_${normalizedCurrentUrl || 'global'}`;
      const legacyKey = `stickyNotes_${sanitizedLegacy(currentUrl)}`;
      const keysToFetch = siteKey === legacyKey ? [siteKey] : [siteKey, legacyKey];

      const result = await chrome.storage.local.get(keysToFetch);
      const notes = result[siteKey] || result[legacyKey] || [];

      console.log(`Auto-loading sticky notes for ${currentUrl}: ${notes.length} notes found`);

      if (notes.length > 0) {
        // Import sticky notes module and use its renderStickyNote function
        const stickyNotesModule = await import(chrome.runtime.getURL('modules/stickyNotesPicker.js'));
        if (stickyNotesModule) {
          const hydrateNotes = stickyNotesModule.hydrateNotesFromStorage || ((data) => data);
          const renderStickyNote = stickyNotesModule.renderStickyNote;
          const hydratedNotes = Array.isArray(notes) ? hydrateNotes(notes) : [];

          hydratedNotes.forEach(note => {
            const existingNote = document.getElementById(note.id);
            if (!existingNote && typeof renderStickyNote === 'function') {
              // Call the module's renderStickyNote function
              renderStickyNote(note);
              console.log(`Auto-rendered note: ${note.id}`);
            }
          });
          console.log('Sticky notes auto-loaded successfully');
        }
      } else {
        console.log('No notes found for auto-loading');
      }
    } catch (error) {
      console.log('Auto-load sticky notes failed:', error);
    }
  }

  // Initialize content script
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      signalReady();
      // Auto-load sticky notes after a short delay
      setTimeout(autoLoadStickyNotes, 500);
    });
  } else {
    signalReady();
    // Auto-load sticky notes after a short delay
    setTimeout(autoLoadStickyNotes, 500);
  }

} // End of pickachu initialization check

} // End of content script loading check
