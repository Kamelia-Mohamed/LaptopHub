const BRAND_COLORS = [
    '#14B8A6', '#F5A524', '#6366F1', '#EC4899', '#0EA5E9',
    '#F97316', '#22C55E', '#8B5CF6', '#EF4444', '#0D9488',
    '#DB2777', '#2563EB'
];

const USETYPE_META = {
    'Gaming':   { color:'#EF4444', label:'Gaming',        goodFor:'Great for gaming and demanding apps' },
    'Creator':  { color:'#8B5CF6', label:'Creator',       goodFor:'Built for editing, design & creative work' },
    'Business': { color:'#2563EB', label:'Business',      goodFor:'Solid for office work & business travel' },
    'Budget':   { color:'#F5A524', label:'Budget',        goodFor:'Affordable pick for basic everyday use' },
    'Student':  { color:'#14B8A6', label:'Everyday',      goodFor:'Good all-rounder for study & browsing' }
};

function hashString(str){
    let hash = 0;
    for (let i = 0; i < str.length; i++){ hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    return Math.abs(hash);
}
function cleanText(str){ return (str || '').toString().replace(/[\u200e\u200f\u2009]/g, ' ').trim(); }
function getBrand(laptop){
    const model = cleanText(laptop.Model);
    return model.split(' ')[0] || 'Unknown';
}
function getBrandColor(brand){ return BRAND_COLORS[hashString(brand) % BRAND_COLORS.length]; }
function getInitials(brand){ return brand.slice(0, 2).toUpperCase(); }

function parseNumber(str){
    const m = (str || '').toString().match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 0;
}
function isValidRamString(str){
    const s = (str || '').toString().toLowerCase();
    return s.includes('ram') && !s.includes('ssd') && !s.includes('hdd');
}
function parseRamGB(laptop){
    return isValidRamString(laptop.Ram) ? parseNumber(laptop.Ram) : 0;
}
function parseStorageGB(laptop){
    const s = (laptop.SSD || '').toString().toLowerCase();
    const n = parseNumber(s);
    return s.includes('tb') ? n * 1024 : n;
}
function parseScreenInches(laptop){
    const n = parseNumber(laptop.Display);
    return n > 5 && n < 25 ? n : 15.6; 
}

function performanceScore(laptop){
    const core = (laptop.Core || '').toLowerCase();
    const gen = (laptop.Generation || '').toLowerCase();
    const combo = core + ' ' + gen;
    let score = 2;
    if (/i9|ryzen 9|m3 max|m2 max|m1 max/.test(combo)) score = 5;
    else if (/i7|ryzen 7|m3 pro|m2 pro|m1 pro|m3\b|m2\b|m1\b/.test(combo)) score = 4;
    else if (/i5|ryzen 5/.test(combo)) score = 3;
    else if (/i3|ryzen 3|celeron|pentium/.test(combo)) score = 2;
    else score = 2;
    if (/octa core|24 cores|32 threads|16 threads/.test(combo)) score = Math.min(5, score + 1);
    return score;
}
function graphicsScore(laptop){
    const g = (laptop.Graphics || '').toLowerCase();
    if (/rtx 40|rtx 4090|rtx 4080|rtx 4070/.test(g)) return 5;
    if (/rtx 30|rtx 4060|rtx 4050|radeon rx 7/.test(g)) return 4;
    if (/rtx 20|gtx|radeon rx|m1 max|m2 max|m3 max/.test(g)) return 4;
    if (/iris xe|radeon graphics|m1\b|m2\b|m3\b/.test(g)) return 2;
    if (/uhd|integrated/.test(g)) return 1;
    return 2;
}
function portabilityScore(laptop){
    const inches = parseScreenInches(laptop);
    if (inches < 14) return 5;
    if (inches < 15) return 4;
    if (inches <= 15.6) return 3;
    if (inches <= 16.5) return 2;
    return 1;
}
function valueScore(laptop){
    const price = laptop.numericPrice || 0;
    const perf = performanceScore(laptop) + graphicsScore(laptop);
    if (price <= 0) return 3;
    const ratio = perf / (price / 40000); 
    return Math.max(1, Math.min(5, Math.round(ratio)));
}
function getFingerprint(laptop){
    return [
        { label:'Power', score: performanceScore(laptop) },
        { label:'Graphics', score: graphicsScore(laptop) },
        { label:'Portable', score: portabilityScore(laptop) },
        { label:'Value', score: valueScore(laptop) }
    ];
}

function classifyUseType(laptop){
    const model = (laptop.Model || '').toLowerCase();
    const gpu = (laptop.Graphics || '').toLowerCase();
    const ram = parseRamGB(laptop);
    const core = (laptop.Core || '').toLowerCase() + ' ' + (laptop.Generation || '').toLowerCase();
    const display = (laptop.Display || '').toLowerCase();
    const price = laptop.numericPrice || 0;

    const gamingWords = ['gaming','legion','rog','victus','predator','nitro','omen','tuf','helios','katana'];
    const businessWords = ['thinkpad','elitebook','probook','latitude','vivobook business','expertbook','business'];

    if (gamingWords.some(w => model.includes(w)) || /rtx|gtx|radeon rx/.test(gpu)) return 'Gaming';
    if ((display.includes('oled') || display.includes('retina') || model.includes('macbook') || model.includes('studio'))
        && (ram >= 16) && /i7|i9|ryzen 7|ryzen 9|m1|m2|m3/.test(core)) return 'Creator';
    if (businessWords.some(w => model.includes(w))) return 'Business';
    if (price > 0 && price < 35000) return 'Budget';
    return 'Student';
}

function formatPrice(n){ return '₹' + Math.round(n).toLocaleString('en-IN'); }

const productsGrid = document.getElementById('all-laptops-grid');
const searchInput = document.getElementById('search-input');
const priceSlider = document.getElementById('price-slider');
const priceValue = document.getElementById('price-value');
const navDropdown = document.getElementById('nav-dropdown');
const showAllBtn = document.getElementById('show-all-btn');
const sortSelect = document.getElementById('sort-select');
const resultsCountNum = document.getElementById('results-count-num');
const activeFilterChips = document.getElementById('active-filter-chips');

const aiModal = document.getElementById('ai-modal');
const detailsModal = document.getElementById('details-modal');
const comparisonModal = document.getElementById('comparison-modal');
const guideModal = document.getElementById('guide-modal');
const wishlistModal = document.getElementById('wishlist-modal');

const compareBar = document.getElementById('compare-bar');
const compareCountText = document.getElementById('compare-count');
const compareNowBtn = document.getElementById('compare-now-btn');
const clearCompareBtn = document.getElementById('clear-compare-btn');
const compareThumbs = document.getElementById('compare-thumbs');

const sidebarFilters = document.getElementById('sidebar-filters');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileFilterBtn = document.getElementById('mobile-filter-btn');

let allLaptops = [];
let filteredLaptops = [];
let compareList = [];
let wishlist = JSON.parse(localStorage.getItem('lh_wishlist') || '[]');
let visibleCount = 24;
const PAGE_SIZE = 24;

let activeFilters = {
    search: '',
    brands: [],
    rams: [],
    useTypes: [],
    maxPrice: 999999,
    aiCategory: '',
    aiBudget: 999999
};

window.addEventListener('DOMContentLoaded', async () => {
    productsGrid.innerHTML = Array(8).fill('<div class="skeleton-card"></div>').join('');
    try {
        const response = await fetch('laptops.json');
        const data = await response.json();
        allLaptops = Array.isArray(data) ? data : (data.laptops || Object.values(data));

        let highestPrice = 0;
        allLaptops.forEach(laptop => {
            laptop.numericPrice = laptop.Price ? (parseFloat(laptop.Price.toString().replace(/[^0-9.]/g, '')) || 0) : 0;
            laptop.brand = getBrand(laptop);
            laptop.useType = classifyUseType(laptop);
            if (laptop.numericPrice > highestPrice) highestPrice = laptop.numericPrice;
        });

        if (highestPrice > 0 && priceSlider) {
            priceSlider.max = highestPrice;
            priceSlider.value = highestPrice;
            priceValue.innerText = formatPrice(highestPrice);
            activeFilters.maxPrice = highestPrice;
        }

        filteredLaptops = [...allLaptops];
        buildHeroStats();
        extractAndBuildFilters(allLaptops);
        buildGuideContent();
        setupEventListeners();
        applyFilters();
    } catch (error) {
        console.error('Error fetching data:', error);
        productsGrid.innerHTML = '<div class="empty-state"><div class="glyph">⚠️</div><h3>Couldn\'t load the laptop catalog</h3><p>Make sure laptops.json is in the same folder as index.html.</p></div>';
    }
});

function buildHeroStats(){
    const brands = new Set(allLaptops.map(l => l.brand)).size;
    const minPrice = Math.min(...allLaptops.map(l => l.numericPrice).filter(p => p > 0));
    document.getElementById('hero-stats').innerHTML = `
        <div class="hero-stat"><b>${allLaptops.length}</b><span>laptops indexed</span></div>
        <div class="hero-stat"><b>${brands}</b><span>brands covered</span></div>
        <div class="hero-stat"><b>${formatPrice(minPrice)}</b><span>starting from</span></div>
    `;
}

function extractAndBuildFilters(laptops){
    const brandsSet = new Set();
    const ramsSet = new Set();
    laptops.forEach(l => {
        if (l.brand) brandsSet.add(l.brand);
        const ramGB = parseRamGB(l);
        if (ramGB > 0) ramsSet.add(ramGB);
    });
    const uniqueBrands = Array.from(brandsSet).sort();
    const uniqueRams = Array.from(ramsSet).sort((a,b) => a - b);

    if (navDropdown){
        navDropdown.innerHTML = '';
        uniqueBrands.forEach(brand => {
            const a = document.createElement('a');
            a.textContent = brand;
            a.href = '#';
            a.addEventListener('click', e => {
                e.preventDefault();
                activeFilters.brands = [brand];
                syncSidebarUI();
                applyFilters();
                document.querySelector('.store-container').scrollIntoView({behavior:'smooth'});
            });
            navDropdown.appendChild(a);
        });
    }

    const useTypeContainer = document.getElementById('usetype-filters');
    if (useTypeContainer){
        useTypeContainer.innerHTML = '';
        Object.keys(USETYPE_META).forEach(type => {
            const pill = document.createElement('span');
            pill.className = 'usetype-pill';
            pill.dataset.usetype = type;
            pill.textContent = USETYPE_META[type].label;
            pill.addEventListener('click', () => {
                toggleArrayValue(activeFilters.useTypes, type);
                syncSidebarUI();
                applyFilters();
            });
            useTypeContainer.appendChild(pill);
        });
    }

    const brandFilterContainer = document.getElementById('brand-filters');
    if (brandFilterContainer){
        brandFilterContainer.innerHTML = '';
        uniqueBrands.forEach(brand => {
            const count = laptops.filter(l => l.brand === brand).length;
            brandFilterContainer.innerHTML += `<label><input type="checkbox" class="brand-cb" value="${brand}"> ${brand} <span class="filter-count">${count}</span></label>`;
        });
    }

    const ramFilterContainer = document.getElementById('ram-filters');
    if (ramFilterContainer){
        ramFilterContainer.innerHTML = '';
        uniqueRams.forEach(ram => {
            const count = laptops.filter(l => parseRamGB(l) === ram).length;
            ramFilterContainer.innerHTML += `<label><input type="checkbox" class="ram-cb" value="${ram}"> ${ram} GB <span class="filter-count">${count}</span></label>`;
        });
    }
}

function toggleArrayValue(arr, value){
    const i = arr.indexOf(value);
    if (i > -1) arr.splice(i, 1); else arr.push(value);
}

function syncSidebarUI(){
    document.querySelectorAll('.brand-cb').forEach(cb => { cb.checked = activeFilters.brands.includes(cb.value); });
    document.querySelectorAll('.ram-cb').forEach(cb => { cb.checked = activeFilters.rams.includes(cb.value); });
    document.querySelectorAll('.usetype-pill').forEach(p => { p.classList.toggle('active', activeFilters.useTypes.includes(p.dataset.usetype)); });
    document.querySelectorAll('.quick-tag').forEach(t => { t.classList.toggle('active', activeFilters.useTypes.includes(t.dataset.usetype)); });
}

function setupEventListeners() {
    if (showAllBtn) {
        showAllBtn.addEventListener('click', e => {
            e.preventDefault();
            resetAllFilters();
            document.querySelector('.store-container').scrollIntoView({behavior: 'smooth'});
        });
    }
// كود تشغيل قائمة البراندات بالضغط للموبايل
    const dropBtn = document.querySelector('.dropbtn');
    const dropdownContent = document.getElementById('nav-dropdown');
    if (dropBtn && dropdownContent) {
        dropBtn.addEventListener('click', (e) => {
            e.preventDefault();
            dropdownContent.classList.toggle('show');
        });
        // قفل القائمة لو اليوزر داس في أي مكان فاضي
        document.addEventListener('click', (e) => {
            if (!e.target.matches('.dropbtn')) {
                dropdownContent.classList.remove('show');
            }
        });
    }
    const browseBtn = document.getElementById('hero-browse-btn');
    if (browseBtn) {
        browseBtn.addEventListener('click', () => {
            document.querySelector('.store-container').scrollIntoView({behavior: 'smooth'});
        });
    }

    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetAllFilters);

    if (searchInput) {
        searchInput.addEventListener('input', e => { 
            activeFilters.search = e.target.value.toLowerCase(); 
            applyFilters(); 
        });
    }

    const searchToggleBtn = document.getElementById('toggle-search-btn');
    const expandableSearch = document.getElementById('expandable-search');
    const closeSearchBtn = document.getElementById('close-search-btn');

    if (searchToggleBtn && expandableSearch && closeSearchBtn) {
        searchToggleBtn.addEventListener('click', () => {
            expandableSearch.classList.toggle('active');
            if (expandableSearch.classList.contains('active')) {
                searchInput.focus();
            }
        });

        closeSearchBtn.addEventListener('click', () => {
            expandableSearch.classList.remove('active');
            searchInput.value = '';
            activeFilters.search = '';
            applyFilters();
        });
    }

    if (sidebarFilters) {
        sidebarFilters.addEventListener('change', e => {
            if (e.target.classList.contains('brand-cb')) activeFilters.brands = Array.from(document.querySelectorAll('.brand-cb:checked')).map(cb => cb.value);
            if (e.target.classList.contains('ram-cb')) activeFilters.rams = Array.from(document.querySelectorAll('.ram-cb:checked')).map(cb => cb.value);
            applyFilters();
        });
    }

    if (priceSlider) {
        priceSlider.addEventListener('input', e => {
            priceValue.innerText = formatPrice(e.target.value);
            activeFilters.maxPrice = parseFloat(e.target.value);
            applyFilters();
        });
    }

    if (sortSelect) sortSelect.addEventListener('change', applyFilters);

    document.querySelectorAll('.quick-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            toggleArrayValue(activeFilters.useTypes, tag.dataset.usetype);
            syncSidebarUI();
            applyFilters();
            document.querySelector('.store-container').scrollIntoView({behavior: 'smooth'});
        });
    });

    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            [aiModal, detailsModal, comparisonModal, guideModal, wishlistModal].forEach(m => { if (m) m.style.display = 'none'; });
        });
    });

    [aiModal, detailsModal, comparisonModal, guideModal, wishlistModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    });

    const openAiBtn = document.getElementById('open-ai-btn');
    if (openAiBtn) openAiBtn.addEventListener('click', openQuiz);

    const openGuideBtn = document.getElementById('open-guide-btn');
    if (openGuideBtn) {
        openGuideBtn.addEventListener('click', () => { 
            guideModal.style.display = 'flex'; 
        });
    }

    const openWishlistBtn = document.getElementById('open-wishlist-btn');
    if (openWishlistBtn) {
        openWishlistBtn.addEventListener('click', () => { 
            renderWishlistModal(); 
            wishlistModal.style.display = 'flex'; 
        });
    }

    if (typeof setupQuizEvents === 'function') setupQuizEvents();

    if (mobileFilterBtn && sidebarFilters && sidebarOverlay) {
        mobileFilterBtn.addEventListener('click', () => { sidebarFilters.classList.add('open'); sidebarOverlay.classList.add('open'); });
        sidebarOverlay.addEventListener('click', () => { sidebarFilters.classList.remove('open'); sidebarOverlay.classList.remove('open'); });
    }

    if (clearCompareBtn) {
        clearCompareBtn.addEventListener('click', () => { compareList = []; updateCompareUI(); renderVisible(); });
    }
    if (compareNowBtn) {
        compareNowBtn.addEventListener('click', renderComparisonTable);
    }
}

function resetAllFilters(){
    activeFilters = { search:'', brands:[], rams:[], useTypes:[], maxPrice: parseFloat(priceSlider.max), aiCategory:'', aiBudget:999999 };
    if (searchInput) searchInput.value = '';
    priceSlider.value = priceSlider.max;
    priceValue.innerText = formatPrice(priceSlider.max);
    syncSidebarUI();
    applyFilters();
}

function applyFilters(){
    filteredLaptops = allLaptops.filter(laptop => {
        const brandMatch = activeFilters.brands.length === 0 || activeFilters.brands.includes(laptop.brand);
        const ramMatch = activeFilters.rams.length === 0 || activeFilters.rams.includes(String(parseRamGB(laptop)));
        const useTypeMatch = activeFilters.useTypes.length === 0 || activeFilters.useTypes.includes(laptop.useType);
        const priceMatch = laptop.numericPrice <= activeFilters.maxPrice;

        const searchString = Object.values(laptop).join(' ').toLowerCase();
        const searchMatch = activeFilters.search === '' || searchString.includes(activeFilters.search);

        let aiMatch = true;
        if (activeFilters.aiCategory !== ''){
            const coreStr = (laptop.Core || '').toLowerCase();
            const ramStr = (laptop.Ram || '').toLowerCase();
            const displayStr = (laptop.Display || '').toLowerCase();
            const modelStr = (laptop.Model || '').toLowerCase();

            if (activeFilters.aiCategory === 'Study & Browsing'){
                aiMatch = laptop.numericPrice < 50000 || coreStr.includes('i3') || coreStr.includes('ryzen 3');
            } else if (activeFilters.aiCategory === 'Heavy Gaming'){
                aiMatch = ramStr.includes('16') || ramStr.includes('32') || coreStr.includes('i7') || coreStr.includes('i9') || coreStr.includes('ryzen 7') || coreStr.includes('ryzen 9') || modelStr.includes('gaming') || modelStr.includes('victus') || modelStr.includes('legion') || modelStr.includes('rog');
            } else if (activeFilters.aiCategory === 'Video Editing & Design'){
                aiMatch = displayStr.includes('oled') || displayStr.includes('retina') || modelStr.includes('macbook') || modelStr.includes('studio') || (ramStr.includes('16') && (coreStr.includes('i7') || coreStr.includes('ryzen 7')));
            } else if (activeFilters.aiCategory === 'Programming'){
                aiMatch = (ramStr.includes('16') || ramStr.includes('32')) && (coreStr.includes('i5') || coreStr.includes('i7') || coreStr.includes('ryzen 5') || coreStr.includes('ryzen 7') || modelStr.includes('mac'));
            }
            aiMatch = aiMatch && laptop.numericPrice <= activeFilters.aiBudget;
        }

        return brandMatch && ramMatch && useTypeMatch && priceMatch && searchMatch && aiMatch;
    });

    switch (sortSelect.value){
        case 'price-asc': filteredLaptops.sort((a,b) => a.numericPrice - b.numericPrice); break;
        case 'price-desc': filteredLaptops.sort((a,b) => b.numericPrice - a.numericPrice); break;
        case 'rating-desc': filteredLaptops.sort((a,b) => (b.Rating || 0) - (a.Rating || 0)); break;
    }

    visibleCount = PAGE_SIZE;
    renderActiveChips();
    renderVisible();
}

function renderActiveChips(){
    const chips = [];
    activeFilters.brands.forEach(b => chips.push({ label:b, clear:() => { activeFilters.brands = activeFilters.brands.filter(x=>x!==b); } }));
    activeFilters.rams.forEach(r => chips.push({ label:r + ' GB RAM', clear:() => { activeFilters.rams = activeFilters.rams.filter(x=>x!==r); } }));
    activeFilters.useTypes.forEach(t => chips.push({ label: USETYPE_META[t].label, clear:() => { activeFilters.useTypes = activeFilters.useTypes.filter(x=>x!==t); } }));
    if (activeFilters.search) chips.push({ label:`"${activeFilters.search}"`, clear:() => { activeFilters.search=''; if(searchInput) searchInput.value=''; } });
    if (activeFilters.aiCategory) chips.push({ label:`Quiz: ${activeFilters.aiCategory}`, clear:() => { activeFilters.aiCategory=''; } });

    activeFilterChips.innerHTML = '';
    chips.forEach(c => {
        const el = document.createElement('div');
        el.className = 'active-chip';
        el.innerHTML = `${c.label} <button>&times;</button>`;
        el.querySelector('button').addEventListener('click', () => { c.clear(); syncSidebarUI(); applyFilters(); });
        activeFilterChips.appendChild(el);
    });
}

function renderVisible(){
    displayLaptops(filteredLaptops.slice(0, visibleCount));
    resultsCountNum.innerText = filteredLaptops.length;
}
function deviceGlyphHTML(laptop){
    const brandName = laptop.brand.toLowerCase(); // بيخلي اسم البراند حروف صغيرة
    const color = getBrandColor(laptop.brand);
    const initials = getInitials(laptop.brand);
    
    return `
        <img src="images/${brandName}.jpg" 
             style="max-width: 140px; max-height: 110px; object-fit: contain; mix-blend-mode: multiply;" 
             alt="${laptop.brand}" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
             
        <div class="device-glyph" style="background:linear-gradient(135deg, ${color}, ${color}CC); display:none;">
            <span>${initials}</span>
        </div>
    `;
}

function fingerprintHTML(laptop){
    const fp = getFingerprint(laptop);
    return `<div class="fingerprint">
        <div class="fingerprint-title">Spec fingerprint</div>
        ${fp.map(f => `
            <div class="fp-row">
                <span class="fp-label">${f.label}</span>
                <div class="fp-track"><div class="fp-fill" style="width:${f.score*20}%; background:linear-gradient(90deg, var(--teal-500), var(--amber-500));"></div></div>
            </div>
        `).join('')}
    </div>`;
}

function displayLaptops(laptopsArray){
    productsGrid.innerHTML = '';

    if (laptopsArray.length === 0){
        productsGrid.innerHTML = `<div class="empty-state">
            <div class="glyph">🔍</div>
            <h3>No laptops match those filters</h3>
            <p>Try widening your price range or clearing a filter.</p>
            <button id="empty-reset-btn">Reset all filters</button>
        </div>`;
        document.getElementById('empty-reset-btn').addEventListener('click', resetAllFilters);
        return;
    }

    laptopsArray.forEach(laptop => {
        const price = laptop.numericPrice ? formatPrice(laptop.numericPrice) : 'Price N/A';
        const meta = USETYPE_META[laptop.useType];
        const isCompared = compareList.some(item => item.Model === laptop.Model);
        const isWishlisted = wishlist.includes(laptop.Model);

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="card-visual" style="background:${getBrandColor(laptop.brand)}14;">
                <span class="card-badge" style="background:${meta.color};">${meta.label}</span>
                <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" title="Save">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
                </button>
                ${deviceGlyphHTML(laptop)}
            </div>
            <div class="card-body">
                <h3>${laptop.Model || 'Unknown Model'}</h3>
                <div class="card-meta">
                    ${laptop.Rating ? `<span class="rating-pill">★ ${laptop.Rating}</span>` : ''}
                    <span class="goodfor-text">${meta.goodFor}</span>
                </div>
                <div class="product-price">${price}</div>
                <div class="product-specs">
                    <p><strong>CPU</strong> ${laptop.Core || 'N/A'}</p>
                    <p><strong>RAM</strong> ${laptop.Ram || 'N/A'}</p>
                    <p><strong>Storage</strong> ${laptop.SSD || 'N/A'}</p>
                </div>
                ${fingerprintHTML(laptop)}
                <div class="buttons-group">
                    <button class="view-btn">View Details</button>
                    <button class="add-compare-btn ${isCompared ? 'selected' : ''}">${isCompared ? 'Added ✓' : 'Compare'}</button>
                </div>
            </div>
        `;

        card.querySelector('.view-btn').addEventListener('click', () => openFullDetails(laptop));
        card.querySelector('.add-compare-btn').addEventListener('click', e => toggleCompare(laptop, e.target));
        card.querySelector('.wishlist-btn').addEventListener('click', e => { e.stopPropagation(); toggleWishlist(laptop, e.currentTarget); });

        productsGrid.appendChild(card);
    });

    if (filteredLaptops.length > laptopsArray.length){
        const wrap = document.createElement('div');
        wrap.className = 'load-more-wrap';
        wrap.innerHTML = `<button class="load-more-btn">Show more (${filteredLaptops.length - laptopsArray.length} left)</button>`;
        wrap.querySelector('button').addEventListener('click', () => { visibleCount += PAGE_SIZE; renderVisible(); });
        productsGrid.appendChild(wrap);
    }
}

const SPECS_DICTIONARY = {
    'Core': 'The brain of the laptop. More cores/threads means it juggles tasks faster.',
    'Generation': 'Newer generation chips are usually faster and more power-efficient, even at the same name (e.g. i5).',
    'Ram': 'Short-term memory. 16GB or more lets you keep many apps open without lag.',
    'SSD': 'Storage for your files and apps. SSD makes everything load almost instantly.',
    'Graphics': 'Handles visuals. Matters most for gaming, video editing, and 3D work.',
    'Display': 'Screen size and resolution. Higher resolution means sharper text and images.',
    'OS': 'The operating system that runs the laptop, e.g. Windows or macOS.',
    'Warranty': 'How long the manufacturer covers repairs for free if something breaks.',
    'Rating': 'An overall score out of 100 summarising reviews and specs for this model.'
};

function openFullDetails(laptop){
    const container = document.getElementById('full-details-container');
    const meta = USETYPE_META[laptop.useType];
    const price = laptop.numericPrice ? formatPrice(laptop.numericPrice) : 'Price N/A';
    const isCompared = compareList.some(item => item.Model === laptop.Model);
    const isWishlisted = wishlist.includes(laptop.Model);

    let specsHTML = '';
    for (const [key, value] of Object.entries(laptop)){
        if (['id','numericPrice','image','Unnamed: 0','brand','useType'].includes(key)) continue;
        if (value === null || value === '') continue;
        const tooltip = SPECS_DICTIONARY[key] ? `<div class="info-tooltip">?<span class="tooltip-text">${SPECS_DICTIONARY[key]}</span></div>` : '';
        specsHTML += `<div class="spec-row"><div class="spec-label">${key}${tooltip}</div><div class="spec-value">${value}</div></div>`;
    }

    container.innerHTML = `
        <div class="details-layout">
            <div class="details-image-container" style="background:${getBrandColor(laptop.brand)}14;">
                ${deviceGlyphHTML(laptop)}
            </div>
            <div class="details-info-container">
                <span class="details-badge" style="background:${meta.color};">${meta.label}</span>
                <div class="details-title-row"><h2>${laptop.Model || 'Unknown Model'}</h2></div>
                <div class="details-price">${price}</div>
                <div class="details-goodfor">${meta.goodFor}</div>
                <div class="details-actions">
                    <button class="primary" id="details-compare-btn">${isCompared ? 'Added to compare ✓' : '+ Add to compare'}</button>
                    <button id="details-wishlist-btn">${isWishlisted ? '♥ Saved' : '♡ Save for later'}</button>
                </div>
                ${fingerprintHTML(laptop)}
                <div class="specs-grid" style="margin-top:18px;">${specsHTML}</div>
            </div>
        </div>
    `;

    document.getElementById('details-compare-btn').addEventListener('click', e => toggleCompare(laptop, e.target, true));
    document.getElementById('details-wishlist-btn').addEventListener('click', e => toggleWishlist(laptop, e.target, true));

    detailsModal.style.display = 'flex';
}

function toggleCompare(laptop, btnElement, isDetailsView){
    const index = compareList.findIndex(item => item.Model === laptop.Model);
    if (index > -1){
        compareList.splice(index, 1);
        if (isDetailsView){ btnElement.innerText = '+ Add to compare'; }
        else { btnElement.classList.remove('selected'); btnElement.innerText = 'Compare'; }
    } else {
        if (compareList.length >= 3){ alert('You can only compare up to 3 laptops at a time.'); return; }
        compareList.push(laptop);
        if (isDetailsView){ btnElement.innerText = 'Added to compare ✓'; }
        else { btnElement.classList.add('selected'); btnElement.innerText = 'Added ✓'; }
    }
    updateCompareUI();
}

function updateCompareUI(){
    compareCountText.innerText = compareList.length;
    compareThumbs.innerHTML = compareList.map(l => `<div class="compare-thumb" style="background:${getBrandColor(l.brand)};">${getInitials(l.brand)}</div>`).join('');
    if (compareList.length > 0){
        compareBar.classList.add('active');
    } else {
        compareBar.classList.remove('active');
        comparisonModal.style.display = 'none';
    }
}

function renderComparisonTable(){
    if (compareList.length < 2){ alert('Please select at least 2 laptops to compare.'); return; }

    const container = document.getElementById('comparison-table-container');
    const numericRows = { 'Price': l => l.numericPrice, 'Ram': l => parseRamGB(l), 'SSD': l => parseStorageGB(l), 'Rating': l => l.Rating || 0 };
    let allKeys = new Set();
    compareList.forEach(l => Object.keys(l).forEach(k => { if (!['id','numericPrice','image','Unnamed: 0','brand','useType'].includes(k)) allKeys.add(k); }));

    let html = `<table class="compare-table"><thead><tr><th>Feature</th>`;
    compareList.forEach(l => {
        html += `<th>
            <div class="compare-thumb" style="background:${getBrandColor(l.brand)}; margin-bottom:8px;">${getInitials(l.brand)}</div>
            ${l.Model}
            <div><button class="compare-remove" data-model="${l.Model}">Remove</button></div>
        </th>`;
    });
    html += `</tr></thead><tbody>`;

    Array.from(allKeys).forEach(key => {
        html += `<tr><td>${key}</td>`;
        let bestIdx = -1;
        if (numericRows[key]){
            const values = compareList.map(numericRows[key]);
            if (key === 'Price') bestIdx = values.indexOf(Math.min(...values.filter(v=>v>0)));
            else bestIdx = values.indexOf(Math.max(...values));
        }
        compareList.forEach((l, i) => {
            const raw = l[key];
            const display = key === 'Price' ? formatPrice(l.numericPrice) : (raw || '-');
            const cls = i === bestIdx ? 'best-value' : '';
            html += `<td class="${cls}">${display}${i === bestIdx ? ' ✓' : ''}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;

    container.querySelectorAll('.compare-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            compareList = compareList.filter(l => l.Model !== btn.dataset.model);
            updateCompareUI();
            renderVisible();
            if (compareList.length < 2) comparisonModal.style.display = 'none';
            else renderComparisonTable();
        });
    });

    comparisonModal.style.display = 'flex';
}

function toggleWishlist(laptop, btnElement, isDetailsView){
    const index = wishlist.indexOf(laptop.Model);
    if (index > -1){ wishlist.splice(index, 1); } else { wishlist.push(laptop.Model); }
    localStorage.setItem('lh_wishlist', JSON.stringify(wishlist));

    const badge = document.getElementById('wishlist-count');
    if (wishlist.length > 0){ badge.style.display = 'flex'; badge.innerText = wishlist.length; }
    else { badge.style.display = 'none'; }

    if (isDetailsView){ btnElement.innerText = wishlist.includes(laptop.Model) ? '♥ Saved' : '♡ Save for later'; }
    else {
        btnElement.classList.toggle('active');
    }
}

function renderWishlistModal(){
    const grid = document.getElementById('wishlist-grid');
    const items = allLaptops.filter(l => wishlist.includes(l.Model));
    if (items.length === 0){
        grid.innerHTML = `<div class="empty-state" style="padding:30px;"><div class="glyph">♡</div><h3>No saved laptops yet</h3><p>Tap the heart icon on any laptop to save it here.</p></div>`;
        return;
    }
    displayInto(grid, items);
}
function displayInto(targetEl, laptopsArray){
    targetEl.innerHTML = '';
    laptopsArray.forEach(laptop => {
        const price = laptop.numericPrice ? formatPrice(laptop.numericPrice) : 'Price N/A';
        const meta = USETYPE_META[laptop.useType];
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="card-visual" style="background:${getBrandColor(laptop.brand)}14;">
                <span class="card-badge" style="background:${meta.color};">${meta.label}</span>
                ${deviceGlyphHTML(laptop)}
            </div>
            <div class="card-body">
                <h3>${laptop.Model}</h3>
                <div class="product-price">${price}</div>
                <div class="buttons-group">
                    <button class="view-btn">View Details</button>
                    <button class="add-compare-btn">Compare</button>
                </div>
            </div>`;
        card.querySelector('.view-btn').addEventListener('click', () => { wishlistModal.style.display = 'none'; openFullDetails(laptop); });
        card.querySelector('.add-compare-btn').addEventListener('click', e => toggleCompare(laptop, e.target));
        targetEl.appendChild(card);
    });
}

let selectedAiCategory = '';
let selectedAiBudget = 999999;

function openQuiz(){
    aiModal.style.display = 'flex';
    document.getElementById('quiz-step-1').style.display = 'block';
    document.getElementById('quiz-step-2').style.display = 'none';
    document.getElementById('analyze-btn').style.display = 'none';
    document.getElementById('qp-1').classList.add('done');
    document.getElementById('qp-2').classList.remove('done');
    document.getElementById('ai-results').innerText = '';
}

function setupQuizEvents(){
    document.querySelectorAll('#ai-chips .chip').forEach(chip => {
        chip.addEventListener('click', e => {
            document.querySelectorAll('#ai-chips .chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            selectedAiCategory = e.target.getAttribute('data-value');
            document.getElementById('quiz-step-1').style.display = 'none';
            document.getElementById('quiz-step-2').style.display = 'block';
            document.getElementById('analyze-btn').style.display = 'inline-block';
            document.getElementById('qp-2').classList.add('done');
        });
    });

    document.querySelectorAll('#budget-chips .chip').forEach(chip => {
        chip.addEventListener('click', e => {
            document.querySelectorAll('#budget-chips .chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            selectedAiBudget = parseFloat(e.target.getAttribute('data-value'));
        });
    });

    document.getElementById('quiz-back-btn').addEventListener('click', () => {
        document.getElementById('quiz-step-1').style.display = 'block';
        document.getElementById('quiz-step-2').style.display = 'none';
        document.getElementById('analyze-btn').style.display = 'none';
        document.getElementById('qp-2').classList.remove('done');
    });

    document.getElementById('analyze-btn').addEventListener('click', () => {
        if (!selectedAiCategory) return;
        const resDiv = document.getElementById('ai-results');
        resDiv.innerText = `Finding the best matches for ${selectedAiCategory}...`;
        setTimeout(() => {
            aiModal.style.display = 'none';
            activeFilters.aiCategory = selectedAiCategory;
            activeFilters.aiBudget = selectedAiBudget;
            applyFilters();
            resDiv.innerText = '';
            document.querySelector('.store-container').scrollIntoView({behavior:'smooth'});
        }, 700);
    });
}

function buildGuideContent(){
    const items = [
        { icon:'🧠', color:'#14B8A6', title:'CPU / Core (the brain)', text:'Handles calculations. i3/Ryzen 3 = basic tasks, i5/Ryzen 5 = comfortable everyday use, i7/i9 or Ryzen 7/9 = heavy multitasking, editing, or gaming.' },
        { icon:'💾', color:'#F5A524', title:'RAM (short-term memory)', text:'8GB is fine for browsing and office work. 16GB is the sweet spot for multitasking. 32GB+ is for video editing or heavy dev work.' },
        { icon:'📦', color:'#6366F1', title:'SSD / Storage', text:'This is where your files live. An SSD (not HDD) makes the laptop boot and open apps almost instantly. 512GB is comfortable for most people.' },
        { icon:'🎮', color:'#EF4444', title:'Graphics (GPU)', text:'Integrated graphics (Intel Iris/UHD) are fine for everyday use. A dedicated GPU (RTX/GTX/Radeon) is needed for gaming, 3D, or serious video editing.' },
        { icon:'🖥️', color:'#8B5CF6', title:'Display', text:'Look at size (13-14" is portable, 15-16" is a good balance) and resolution — 1920x1080 (Full HD) or higher looks noticeably sharper.' },
        { icon:'🛡️', color:'#0EA5E9', title:'Warranty', text:'Standard is usually 1 year. Longer warranties cost more but save you money if something breaks.' }
    ];
    document.getElementById('guide-grid').innerHTML = items.map(i => `
        <div class="guide-item">
            <div class="g-icon" style="background:${i.color}22; color:${i.color};">${i.icon}</div>
            <h4>${i.title}</h4>
            <p>${i.text}</p>
        </div>
    `).join('');
}

(function initWishlistBadge(){
    const badge = document.getElementById('wishlist-count');
    if (wishlist.length > 0 && badge){ badge.style.display = 'flex'; badge.innerText = wishlist.length; }
})();
