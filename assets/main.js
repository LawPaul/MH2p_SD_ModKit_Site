// Client-side Mod Bundle Builder
// - uses JSZip (loaded from CDN in index.html)
// - fetches modkit zip + selected mod zips, unpacks them, moves mods into Mods/<id>/, and rebuilds a ZIP

(function () {
  const MODKIT_URL = 'https://github.lawpaul.workers.dev/?user=LawPaul&repo=MH2p_SD_ModKit';
  const MODS = [
    {
      id: 'Phone_FullScreen',
      name: 'Phone Full Screen',
      url: 'https://github.lawpaul.workers.dev/?user=LawPaul&repo=MH2p_CarPlay_FullScreen',
      description: 'changes Apple CarPlay/Android Auto to true full screen',
      brands: ['Audi', 'Porsche']
    },
    {
      id: 'Phone_WindowedFullScreen',
      name: 'Phone Windowed Full Screen',
      url: 'https://github.lawpaul.workers.dev/?user=LawPaul&repo=MH2p_CarPlay_WindowedFullScreen',
      description: 'changes Apple CarPlay/Android Auto to windowed full screen (still shows side & top bars)',
      brands: ['Audi', 'Porsche']
    },
    {
      id: 'AppleCarPlay',
      name: 'Apple CarPlay',
      url: 'https://github.lawpaul.workers.dev/?user=LawPaul&repo=MH2p_AppleCarPlay',
      description: 'activates wired & wireless Apple CarPlay (*wireless not supported in all countries, see troubleshooting)',
      brands: ['Audi', 'Lamborghini', 'Porsche', 'Volkswagen']
    },
    {
      id: 'AndroidAuto',
      name: 'Android Auto',
      url: 'https://github.lawpaul.workers.dev/?user=LawPaul&repo=MH2p_AndroidAuto',
      description: 'activates wired Android Auto (wireless not supported)',
      brands: ['Audi', 'Lamborghini', 'Porsche', 'Volkswagen']
    },
    {
      id: 'NavCompassIgnore',
      name: 'Navigation Compass Ignore',
      url: 'https://github.lawpaul.workers.dev/?user=LawPaul&repo=MH2p_NavCompassIgnore',
      description: 'shows MH2p maps in instrument cluster when phone navigation is running',
      brands: ['Audi']
    }
  ];

  // Helpers
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  function setStatus(text, isError) {
    const el = $('#builder-status');
    el.textContent = text || '';
    el.classList.toggle('text-danger', !!isError);
  }

  function stripTopFolder(name) {
    // remove first path segment from a path like repo-main/path/to/file
    const parts = name.split('/');
    if (parts.length <= 1) return '';
    return parts.slice(1).join('/');
  }

  async function fetchAsArrayBuffer(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch ' + url + ' — ' + res.status + ' ' + res.statusText);
    return await res.arrayBuffer();
  }

  async function unzipToJSZip(arrayBuffer) {
    // JSZip is loaded globally
    return await JSZip.loadAsync(arrayBuffer);
  }

  async function buildBundle(selectedMods) {
    setStatus('Fetching files...');
    const finalZip = new JSZip();

    // 1) load modkit
    setStatus('Downloading Mod Kit...');
    const kitBuf = await fetchAsArrayBuffer(MODKIT_URL);
    const kitZip = await unzipToJSZip(kitBuf);

    // copy contents of kit to root of final zip (strip top folder)
    kitZip.forEach((relativePath, zipEntry) => {
      const stripped = stripTopFolder(relativePath);
      if (!stripped) return; // skip top folder entry
      if (zipEntry.dir) return; // skip explicit directories; files will create folders
      finalZip.file(stripped, zipEntry.async('arraybuffer'));
    });

    // Ensure Mods/ directory exists in final zip
    // (JSZip will create folders automatically when adding files)

    // Fetch mods concurrently
    for (let i = 0; i < selectedMods.length; i++) {
      const mod = selectedMods[i];
      setStatus(`Downloading mod ${i + 1}/${selectedMods.length}: ${mod.name}...`);
      const buf = await fetchAsArrayBuffer(mod.url);
      const modZip = await unzipToJSZip(buf);

      // Copy mod contents under Mods/<mod.id>/ (strip the archive's top folder and any leading 'Mods/')
      modZip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;
        let stripped = stripTopFolder(relativePath);
        if (!stripped) return; // entry was the top-level dir

        if (stripped.startsWith('Mods/')) stripped = stripped.slice('Mods/'.length);

        const targetPath = `Mods/${mod.id}/${stripped}`;
        finalZip.file(targetPath, zipEntry.async('arraybuffer'));
      });
    }

    // 3) generate final zip
    setStatus('Creating final ZIP — this may take a few seconds...');
    const blob = await finalZip.generateAsync({ type: 'blob', compression: 'DEFLATE' }, meta => {
      if (meta.percent) setStatus(`Zipping: ${Math.round(meta.percent)}%`);
    });

    return blob;
  }

  // UI wiring
  function renderModsList() {
    const container = $('#mods-list');
    container.innerHTML = '';

    // Ensure a brand filter button group exists above the mods list. We insert it once and reuse it.
    let filterGroup = document.getElementById('brand-filter-group');
    if (!filterGroup) {
      const wrapper = document.createElement('div');
      wrapper.className = 'mb-3';

      filterGroup = document.createElement('div');
      filterGroup.id = 'brand-filter-group';
      filterGroup.className = 'btn-group';
      filterGroup.setAttribute('role', 'group');
      filterGroup.setAttribute('aria-label', 'Brand selection');

      const brands = ['Audi', 'Lamborghini', 'Porsche', 'Volkswagen'];
      brands.forEach((b, idx) => {
        const radioId = 'brand-' + b;
        const radioInput = document.createElement('input');
        radioInput.type = 'radio';
        radioInput.className = 'btn-check';
        radioInput.id = radioId;
        radioInput.name = 'brand-filter';
        radioInput.value = b;
        if (idx === 0) radioInput.checked = true; // default to first brand

        const radioLabel = document.createElement('label');
        radioLabel.className = 'btn btn-outline-primary';
        radioLabel.htmlFor = radioId;
        radioLabel.textContent = b;

        filterGroup.appendChild(radioInput);
        filterGroup.appendChild(radioLabel);

        // re-render list when filter changes
        radioInput.addEventListener('change', renderModsList);
      });

      wrapper.appendChild(filterGroup);
      // insert wrapper before the container
      container.parentNode.insertBefore(wrapper, container);
    }

    // selected brand (get checked radio button value)
    const checkedRadio = document.querySelector('input[name="brand-filter"]:checked');
    const selectedBrand = (checkedRadio && checkedRadio.value) ? checkedRadio.value : 'Audi';

    // Descriptions are provided directly on each MODS entry; optional `brands` array on a mod
    MODS.forEach(mod => {
      // If mod.brands is undefined or empty, treat it as compatible with all brands
      const compatible = !Array.isArray(mod.brands) || mod.brands.length === 0 || mod.brands.includes(selectedBrand) || selectedBrand === 'All';
      if (!compatible) return;

      const row = document.createElement('div');
      row.className = 'mod-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'mod-' + mod.id;
      checkbox.className = 'form-check-input me-2';

      const name = document.createElement('label');
      name.htmlFor = checkbox.id;
      name.className = 'name';
      name.textContent = mod.name;

      row.appendChild(checkbox);
      row.appendChild(name);

      const descEl = document.createElement('div');
      descEl.className = 'small text-muted';
      descEl.textContent = mod.description || '';

      const descWrapper = document.createElement('div');
      descWrapper.appendChild(descEl);
      row.appendChild(descWrapper);

      container.appendChild(row);
    });

    // enable/disable download button when selection changes
    container.addEventListener('change', (e) => {
      // enforce mutual exclusivity: Phone_FullScreen and Phone_WindowedFullScreen cannot both be checked
      if (e.target.id === 'mod-Phone_FullScreen' && e.target.checked) {
        const windowedCheckbox = document.getElementById('mod-Phone_WindowedFullScreen');
        if (windowedCheckbox) windowedCheckbox.checked = false;
      } else if (e.target.id === 'mod-Phone_WindowedFullScreen' && e.target.checked) {
        const fullscreenCheckbox = document.getElementById('mod-Phone_FullScreen');
        if (fullscreenCheckbox) fullscreenCheckbox.checked = false;
      }
      updateDownloadState();
    });
    updateDownloadState();
  }

  function updateDownloadState() {
    const anyMods = MODS.some(m => document.getElementById('mod-' + m.id)?.checked);
    $('#download-btn').disabled = !anyMods;
  }

  function getSelectedMods() {
    return MODS.filter(m => document.getElementById('mod-' + m.id)?.checked);
  }

  // Attach handlers
  document.addEventListener('DOMContentLoaded', () => {
    // Render list
    renderModsList();

    $('#download-btn').addEventListener('click', async () => {
      try {
        const selected = getSelectedMods();

        // disable UI while running
        $('#download-btn').disabled = true;

        setStatus('Starting build...');

        const blob = await buildBundle(selected);

        // generate filename
        const fileName = `MH2p_ModKit_Mods_Bundle.zip`;

        // trigger download
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setStatus('Done — download should start automatically.');
      } catch (err) {
        console.error(err);
        setStatus('Error: ' + (err && err.message ? err.message : String(err)), true);
      } finally {
        $('#download-btn').disabled = false;
      }
    });
  });

})();
