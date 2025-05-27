// Enhanced Sharing Page Application
class ShareApp {
  constructor() {
    this.listData = null;
    this.viewMode = 'grid';
    this.showCompleted = true;
    this.currentTheme = 'light';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadSharedList();
  }

  setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', this.toggleTheme.bind(this));
    
    // Get extension button
    document.getElementById('get-extension').addEventListener('click', this.openExtensionStore.bind(this));
    
    // View controls
    document.getElementById('grid-view').addEventListener('click', () => this.setViewMode('grid'));
    document.getElementById('list-view').addEventListener('click', () => this.setViewMode('list'));
    document.getElementById('filter-completed').addEventListener('click', this.toggleCompletedFilter.bind(this));
    
    // Actions
    document.getElementById('share-button').addEventListener('click', this.showShareModal.bind(this));
    document.getElementById('print-button').addEventListener('click', this.printList.bind(this));
    document.getElementById('retry-button').addEventListener('click', this.loadSharedList.bind(this));
    
    // Modal
    document.getElementById('close-share-modal').addEventListener('click', this.hideShareModal.bind(this));
    document.getElementById('copy-url').addEventListener('click', this.copyShareUrl.bind(this));
    
    // Social sharing
    document.querySelectorAll('.social-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const platform = e.currentTarget.dataset.platform;
        this.shareToSocial(platform);
      });
    });
    
    // Modal overlay click
    document.getElementById('share-modal').addEventListener('click', (e) => {
      if (e.target.id === 'share-modal') {
        this.hideShareModal();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  async loadSharedList() {
    try {
      this.showLoading(true);
      
      // Get data from URL hash
      const hash = window.location.hash.substring(1);
      if (!hash) {
        throw new Error('No list data found in URL');
      }
      
      // Decode the shared data
      const decodedData = this.decodeShareData(hash);
      if (!decodedData) {
        throw new Error('Invalid list data format');
      }
      
      this.listData = decodedData;
      
      // Apply theme if specified
      if (decodedData.theme) {
        this.applyTheme(decodedData.theme);
      }
      
      // Update page metadata
      this.updatePageMetadata();
      
      // Render the list
      this.render();
      
      this.showLoading(false);
      this.showMainContent(true);
      
    } catch (error) {
      console.error('Failed to load shared list:', error);
      this.showError(error.message);
    }
  }

  decodeShareData(encoded) {
    try {
      const jsonString = this.b64ToUtf8(encoded);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to decode share data:', error);
      return null;
    }
  }

  b64ToUtf8(str) {
    return decodeURIComponent(escape(atob(str)));
  }

  utf8ToB64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  updatePageMetadata() {
    if (!this.listData) return;
    
    // Update page title
    document.title = `${this.listData.title} - List Assist`;
    
    // Update meta tags
    const description = this.listData.subtitle || 'Shared shopping list from List Assist';
    document.querySelector('meta[name="description"]').content = description;
    document.querySelector('meta[property="og:title"]').content = this.listData.title;
    document.querySelector('meta[property="og:description"]').content = description;
    document.querySelector('meta[property="twitter:title"]').content = this.listData.title;
    document.querySelector('meta[property="twitter:description"]').content = description;
  }

  render() {
    if (!this.listData) return;
    
    this.renderHeader();
    this.renderStats();
    this.renderProgress();
    this.renderItems();
    this.renderDisclosure();
  }

  renderHeader() {
    document.getElementById('list-title').textContent = this.listData.title;
    document.getElementById('list-subtitle').textContent = this.listData.subtitle || '';
    
    // Hide subtitle if empty
    const subtitleElement = document.getElementById('list-subtitle');
    subtitleElement.style.display = this.listData.subtitle ? 'block' : 'none';
  }

  renderStats() {
    const stats = this.calculateStats();
    
    document.getElementById('total-items').textContent = stats.total;
    document.getElementById('completed-items').textContent = stats.completed;
    document.getElementById('progress-percentage').textContent = `${stats.percentage}%`;
  }

  renderProgress() {
    const stats = this.calculateStats();
    document.getElementById('progress-fill').style.width = `${stats.percentage}%`;
  }

  renderItems() {
    const container = document.getElementById('items-grid');
    const items = this.getFilteredItems();
    
    container.className = `items-grid ${this.viewMode}-view`;
    
    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-message">
          <p>No items to display</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = items.map(item => this.renderItemCard(item)).join('');
  }

  renderItemCard(item) {
    const isCompleted = item.bought || false;
    const hasUrl = item.url && this.isValidUrl(item.url);
    const retailer = this.detectRetailer(item.url);
    
    return `
      <div class="item-card ${isCompleted ? 'completed' : ''}">
        <div class="item-header">
          <div class="item-name">${this.escapeHtml(item.name)}</div>
          ${isCompleted ? `
            <div class="completion-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              Done
            </div>
          ` : ''}
        </div>
        
        <div class="item-details">
          ${hasUrl ? `
            <div class="item-url">
              <a href="${item.url}" target="_blank" rel="noopener" class="item-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                View Item
              </a>
              ${retailer ? `<span class="retailer-badge">${retailer}</span>` : ''}
            </div>
          ` : ''}
          
          ${item.notes ? `
            <div class="item-notes">${this.escapeHtml(item.notes)}</div>
          ` : ''}
          
          ${item.price ? `
            <div class="item-price">$${item.price}</div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderDisclosure() {
    const hasAffiliateLinks = this.listData.items.some(item => 
      item.url && this.detectRetailer(item.url)
    );
    
    const disclosureSection = document.getElementById('disclosure-section');
    
    if (hasAffiliateLinks) {
      disclosureSection.style.display = 'block';
      
      // Update disclosure text based on retailers
      const retailers = [...new Set(
        this.listData.items
          .map(item => this.detectRetailer(item.url))
          .filter(Boolean)
      )];
      
      let disclosureText = 'This list contains affiliate links. ';
      
      if (retailers.includes('amazon')) {
        disclosureText += 'As an Amazon Associate, we earn from qualifying purchases. ';
      }
      if (retailers.length > 1 || !retailers.includes('amazon')) {
        disclosureText += 'We may earn a commission from purchases made through our links at no additional cost to you.';
      }
      
      document.getElementById('disclosure-text').textContent = disclosureText;
    } else {
      disclosureSection.style.display = 'none';
    }
  }

  calculateStats() {
    if (!this.listData || !this.listData.items) {
      return { total: 0, completed: 0, percentage: 0 };
    }
    
    const total = this.listData.items.length;
    const completed = this.listData.items.filter(item => item.bought).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, percentage };
  }

  getFilteredItems() {
    if (!this.listData || !this.listData.items) return [];
    
    let items = [...this.listData.items];
    
    if (!this.showCompleted) {
      items = items.filter(item => !item.bought);
    }
    
    return items;
  }

  // Event handlers
  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    document.body.classList.toggle('dark-mode', this.currentTheme === 'dark');
    
    // Update theme toggle icon
    const icon = document.querySelector('#theme-toggle svg');
    if (this.currentTheme === 'dark') {
      icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    } else {
      icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
  }

  setViewMode(mode) {
    this.viewMode = mode;
    
    // Update button states
    document.getElementById('grid-view').classList.toggle('active', mode === 'grid');
    document.getElementById('list-view').classList.toggle('active', mode === 'list');
    
    this.renderItems();
  }

  toggleCompletedFilter() {
    this.showCompleted = !this.showCompleted;
    
    const button = document.getElementById('filter-completed');
    button.classList.toggle('active', !this.showCompleted);
    button.title = this.showCompleted ? 'Hide Completed' : 'Show All';
    
    this.renderItems();
  }

  openExtensionStore() {
    // Open Chrome Web Store (when published)
    window.open('https://github.com/tradexy/cline-ext-colab-listassist', '_blank');
  }

  showShareModal() {
    const modal = document.getElementById('share-modal');
    const urlInput = document.getElementById('share-url');
    
    urlInput.value = window.location.href;
    modal.style.display = 'flex';
  }

  hideShareModal() {
    document.getElementById('share-modal').style.display = 'none';
  }

  async copyShareUrl() {
    const urlInput = document.getElementById('share-url');
    const copyButton = document.getElementById('copy-url');
    
    try {
      await navigator.clipboard.writeText(urlInput.value);
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    } catch (error) {
      // Fallback for older browsers
      urlInput.select();
      document.execCommand('copy');
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    }
  }

  shareToSocial(platform) {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this shopping list: ${this.listData.title}`);
    
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`
    };
    
    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  }

  printList() {
    window.print();
  }

  handleKeydown(e) {
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'p':
          e.preventDefault();
          this.printList();
          break;
        case 's':
          e.preventDefault();
          this.showShareModal();
          break;
      }
    }
    
    // Escape key
    if (e.key === 'Escape') {
      const modal = document.getElementById('share-modal');
      if (modal.style.display === 'flex') {
        this.hideShareModal();
      }
    }
  }

  // Theme application
  applyTheme(themeData) {
    if (!themeData || typeof themeData !== 'object') return;
    
    const root = document.documentElement;
    
    // Apply colors
    if (themeData.colors) {
      Object.entries(themeData.colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
      });
    }
    
    // Apply fonts
    if (themeData.fonts) {
      Object.entries(themeData.fonts).forEach(([key, value]) => {
        root.style.setProperty(`--font-${key}`, value);
      });
    }
    
    // Determine if dark theme
    if (themeData.colors && themeData.colors.background) {
      const isDark = this.isDarkColor(themeData.colors.background);
      document.body.classList.toggle('dark-mode', isDark);
      this.currentTheme = isDark ? 'dark' : 'light';
    }
  }

  isDarkColor(color) {
    // Simple heuristic to determine if a color is dark
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }

  // Utility methods
  showLoading(show) {
    document.getElementById('loading-state').style.display = show ? 'flex' : 'none';
  }

  showMainContent(show) {
    document.getElementById('main-content').style.display = show ? 'block' : 'none';
  }

  showError(message) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('main-content').style.display = 'none';
    
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    
    errorMessage.textContent = message;
    errorState.style.display = 'flex';
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  detectRetailer(url) {
    if (!url) return null;
    
    const domain = this.extractDomain(url);
    if (!domain) return null;
    
    const retailers = {
      'amazon': ['amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.fr', 'amazon.es', 'amazon.it', 'amazon.co.jp'],
      'ebay': ['ebay.com', 'ebay.co.uk'],
      'aliexpress': ['aliexpress.com']
    };
    
    for (const [retailer, domains] of Object.entries(retailers)) {
      if (domains.some(d => domain.includes(d))) {
        return retailer;
      }
    }
    
    return null;
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (_) {
      return null;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ShareApp();
});

// Handle browser back and forward navigation
window.addEventListener('hashchange', () => {
  location.reload();
});