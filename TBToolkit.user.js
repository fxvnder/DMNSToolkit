// ==UserScript==
// @name         TBToolkit v2.1 RELEASE
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Conjunto de utilidades para as plataformas DMNS - Kayako, WHMCS, cPanel.
// @author       FXVNDER (fxvnder.com), HTL (hallows-tech-labs.pt)
// @match        https://suporte.dominios.pt/staff/*
// @match        https://my.dominios.pt/cp2002/*
// @match        https://*.dnscpanel.com/*
// @match        https://*.ibername.com/*
// @match        https://my.dominios.pt/clientarea.php?action=productdetails&id=*
// @match        https://my.dominios.pt/clientarea.php?action=domaindetails&id=*
// @match        https://my.dominios.pt/cp2002/todolist.php?action=edit&id=*
// @run-at       document-end
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
    'use strict';

    // --- Ícones SVG ---
    const ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`;
    const ICON_EXTERNAL_LINK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>`;

    // --- Funções de Ajuda ---

    /** Cria ícone SVG. */
    function createIcon(svgString) {
        const span = document.createElement('span');
        span.innerHTML = svgString;
        span.style.verticalAlign = 'middle';
        span.style.marginRight = '4px';
        return span;
    }

    /** Cria botão. */
    function createButton(text, icon, clickHandler, isAnchor = false, href = '#') {
        const button = isAnchor ? document.createElement('a') : document.createElement('button');
        // Avoid submit type on button, since that triggers form submissions
        // Evita que o tipo do botão seja submit, isto para que ao modificar forms,
        // não sejam submetidos de imediato os valores
        if (!isAnchor) button.type = 'button';

        button.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-left: 5px;
            padding: 4px 8px;
            background-color: #333;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s;
            text-decoration: none;
            font-weight: bold;
            font-size: 12px;
        `;

        if (icon) {
            button.appendChild(createIcon(icon));
        }
        button.appendChild(document.createTextNode(text));

        button.onmouseover = () => { button.style.backgroundColor = '#555'; };
        button.onmouseout = () => { button.style.backgroundColor = '#333'; };

        if (isAnchor) {
            button.href = href;
            button.target = '_blank';
        }
        // Associar o clickHandler SEMPRE
        if (clickHandler) {
            button.onclick = clickHandler;
        }


        return button;
    }

    /** Notificação "Copiado!". */
    function showCopyNotification(button) {
        const notification = document.createElement('span');
        notification.textContent = 'Copiado!';
        notification.style.cssText = `
            color: #5cb85c;
            margin-left: 5px;
            font-weight: bold;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
        `;
        button.after(notification);
        setTimeout(() => { notification.style.opacity = 1; }, 10);
        setTimeout(() => {
            notification.style.opacity = 0;
            setTimeout(() => { notification.remove(); }, 500);
        }, 1500);
    }

    /** resultscontainer */
    function createResultsContainer(whiteTheme = false) {
        const container = document.createElement('div');
        const themeStyles = whiteTheme ?
            `background-color: white; color: black; border: 1px solid #ddd;` :
            `background-color: #222; color: white; border: 1px solid #444;`;

        container.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            white-space: pre-wrap;
            word-break: break-all;
            ${themeStyles}
        `;
        return container;
    }

    /** painéis de info de domínio (dig, whois, records) */
    function addDomainInfoPanels(domain, parentElement) {
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 20px;
        `;
        parentElement.after(mainContainer);

        // --- SECÇÃO: DIG Nameservers ---
        const digNsSection = document.createElement('div');
        digNsSection.style.flex = '1';
        digNsSection.style.minWidth = '250px';
        const digNsHeader = document.createElement('h4');
        digNsHeader.textContent = 'DIG Nameservers';
        digNsSection.appendChild(digNsHeader);
        const digNsContainer = document.createElement('div');
        digNsContainer.style.cssText = 'display: flex; align-items: center;';
        digNsSection.appendChild(digNsContainer);
        const digNsResultsContainer = createResultsContainer();
        digNsResultsContainer.style.flexGrow = '1';
        digNsContainer.appendChild(digNsResultsContainer);

        fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=NS`, { headers: { 'Accept': 'application/dns-json' } })
            .then(response => response.json())
            .then(data => {
                const nameservers = data.Answer ? data.Answer.map(rec => rec.data.slice(0, -1)).join('\n') : 'Não encontrado';
                digNsResultsContainer.textContent = nameservers;
                const copyNsButton = createButton('', ICON_COPY, () => {
                    GM_setClipboard(nameservers, 'text');
                    showCopyNotification(copyNsButton);
                });
                digNsContainer.appendChild(copyNsButton);
            })
            .catch(e => {
                digNsResultsContainer.textContent = `Erro: ${e.message}`;
                digNsResultsContainer.style.color = 'red';
            });
        mainContainer.appendChild(digNsSection);


        // --- SECÇÃO: DNS Records ---
        const dnsRecordsSection = document.createElement('div');
        dnsRecordsSection.style.flex = '1';
        dnsRecordsSection.style.minWidth = '250px';
        const dnsRecordsHeader = document.createElement('h4');
        dnsRecordsHeader.textContent = 'DNS Records';
        dnsRecordsSection.appendChild(dnsRecordsHeader);
        const dnsRecordsContainer = document.createElement('div');
        dnsRecordsContainer.style.cssText = `display: flex; align-items: center;`;
        dnsRecordsSection.appendChild(dnsRecordsContainer);
        const dnsResultsContainer = createResultsContainer();
        dnsResultsContainer.style.flexGrow = '1';
        dnsRecordsContainer.appendChild(dnsResultsContainer);

        const types = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV'];
        const promises = types.map(type =>
            fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=${type}`, { headers: { 'Accept': 'application/dns-json' } })
                .then(res => res.json())
                .then(data => ({ type, data }))
                .catch(e => ({ type, error: e }))
        );

        Promise.allSettled(promises)
            .then(results => {
                let output = '';
                results.forEach(result => {
                    if (result.status === 'fulfilled' && result.value.data.Answer) {
                        const records = result.value.data.Answer.map(rec => `${rec.data.slice(0, -1)}`).join('\n');
                        output += `[${result.value.type}]:\n${records}\n\n`;
                    }
                });
                dnsResultsContainer.textContent = output.trim() || 'Nenhum registo encontrado.';
                const copyDnsButton = createButton('', ICON_COPY, () => {
                    GM_setClipboard(output.trim(), 'text');
                    showCopyNotification(copyDnsButton);
                });
                dnsRecordsContainer.appendChild(copyDnsButton);
            });
        mainContainer.appendChild(dnsRecordsSection);

        // --- SECÇÃO: WHOIS ---
        const whoisSection = document.createElement('div');
        whoisSection.style.flex = '1';
        whoisSection.style.minWidth = '250px';
        const whoisHeader = document.createElement('h4');
        whoisHeader.textContent = 'WHOIS';
        whoisSection.appendChild(whoisHeader);
        const whoisLinksContainer = document.createElement('div');
        whoisLinksContainer.style.cssText = 'margin-top: 5px; display: flex; gap: 8px; flex-wrap: wrap;';
        whoisSection.appendChild(whoisLinksContainer);
        const whoisSites = {
            'Who.is': `https://who.is/whois/${domain}`,
            'DomainTools': `https://whois.domaintools.com/${domain}`,
            'Whois.com': `https://whois.com/whois/${domain}`,
        };
        for (const [site, url] of Object.entries(whoisSites)) {
            const whoisButton = createButton(site, ICON_EXTERNAL_LINK, null, true, url);
            whoisLinksContainer.appendChild(whoisButton);
        }
        mainContainer.appendChild(whoisSection);

        // --- SECÇÃO: WHOIS PT (.pt) ---
        if (domain.endsWith('.pt')) {
            const whoisPtSection = document.createElement('div');
            whoisPtSection.style.flex = '1';
            whoisPtSection.style.minWidth = '250px';
            const whoisPtHeader = document.createElement('h4');
            whoisPtHeader.textContent = 'WHOIS PT';
            whoisPtSection.appendChild(whoisPtHeader);
            const whoisPtLinksContainer = document.createElement('div');
            whoisPtLinksContainer.style.cssText = 'margin-top: 5px;';
            whoisPtSection.appendChild(whoisPtLinksContainer);

            const domainWithoutTld = domain.substring(0, domain.lastIndexOf('.pt'));
            const ptUrl = `https://www.pt.pt/pt/ferramentas/whois/detalhes/?site=${domainWithoutTld}&tld=.pt`;
            const whoisPtButton = createButton('Consultar PT.pt', ICON_EXTERNAL_LINK, null, true, ptUrl);
            whoisPtLinksContainer.appendChild(whoisPtButton);
            mainContainer.appendChild(whoisPtSection);
        }
    }

    /** Lógica para a página do Kayako. */
    function setupKayako() {
        console.log('DMNSToolkit LOADED - Kayako');
        function addButtonsToTickets() {
            const targetElements = document.querySelectorAll('.ticketpostbottomcontents');
            const emailRegex = /Email: ([\w.-]+@[\w.-]+\.\w+)/;
            targetElements.forEach((element) => {
                if (element.dataset.processed) return;
                const match = element.textContent.match(emailRegex);
                if (match && match[1]) {
                    const email = match[1];
                    const buttonsContainer = document.createElement('span');
                    buttonsContainer.style.marginLeft = '10px';
                    buttonsContainer.style.whiteSpace = 'nowrap';
                    const copyButton = createButton('Copiar Email', ICON_COPY, () => {
                        GM_setClipboard(email, 'text');
                        showCopyNotification(copyButton);
                    });
                    const whmcsButton = createButton('Abrir WHMCS', ICON_EXTERNAL_LINK, () => {
                        GM_setValue('clienteEmail', email); // Prepara a pesquisa
                    }, true, 'https://my.dominios.pt/cp2002/'); // É uma âncora que navega
                    const clientAreaButton = createButton('Área de Cliente', ICON_EXTERNAL_LINK, null, true, `https://my.dominios.pt/dologin.php?username=${encodeURIComponent(email)}`);
                    buttonsContainer.append(copyButton, whmcsButton, clientAreaButton);
                    const targetParagraph = element.querySelector('p') || element;
                    targetParagraph.appendChild(buttonsContainer);
                    element.dataset.processed = 'true';
                }
            });
        }
        const observer = new MutationObserver(addButtonsToTickets);
        observer.observe(document.body, { childList: true, subtree: true });
        addButtonsToTickets();
    }

    /** Lógica para a página de login/admin do WHMCS, agora com pesquisa genérica. */
    function setupWHMCSAdmin() {
        console.log('DMNSToolkit LOADED - WHMCS Admin');
        setTimeout(() => {
            // Verifica primeiro a pesquisa genérica (ex: Service ID)
            const searchType = GM_getValue('whmcsSearchType', null);
            const searchField = GM_getValue('whmcsSearchField', null);
            const searchQuery = GM_getValue('whmcsSearchQuery', null);

            if (searchType && searchField && searchQuery) {
                const typeDropdown = document.getElementById('searchtype');
                const fieldDropdown = document.getElementById('searchfield');
                const searchInput = document.querySelector('form[action="search.php"] input[name="q"]');
                const searchButton = document.querySelector('form[action="search.php"] input[type="submit"]');

                if (typeDropdown && fieldDropdown && searchInput && searchButton) {
                    typeDropdown.value = searchType;
                    typeDropdown.dispatchEvent(new Event('change'));

                    setTimeout(() => {
                        fieldDropdown.value = searchField;
                        searchInput.value = searchQuery;
                        searchButton.click();
                        console.log(`DMNSToolkit: Pesquisa por ${searchType} > ${searchField} = ${searchQuery} iniciada.`);
                        GM_deleteValue('whmcsSearchType');
                        GM_deleteValue('whmcsSearchField');
                        GM_deleteValue('whmcsSearchQuery');
                    }, 200);
                } else {
                    console.error("DMNSToolkit: Elementos de pesquisa genérica não encontrados.");
                }
                return;
            }

            // Lógica antiga para pesquisa de email (fallback)
            const email = GM_getValue('clienteEmail', null);
            if (email) {
                // A pesquisa de email geralmente usa o campo de pesquisa inteligente, não os dropdowns.
                const searchInputEmail = document.querySelector('input[name="q"]');
                const fieldSelector = document.getElementById('searchfield');
                fieldSelector.value = 'Email Address';
                const searchButtonEmail = document.querySelector('input[type="submit"][value="Search"]');
                if (searchInputEmail && searchButtonEmail) {
                    searchInputEmail.value = email;
                    searchButtonEmail.click();
                    console.log('DMNSToolkit: Pesquisa no WHMCS por email iniciada.');
                    GM_deleteValue('clienteEmail');
                } else {
                    console.error("DMNSToolkit: Elementos de pesquisa de email não encontrados.");
                }
            }
        }, 1500);
    }

    /** Lógica para a página de detalhes de produto do WHMCS. */
    function setupWHMCSProductDetails() {
        console.log('DMNSToolkit LOADED - WHMCS Product Details');
        const whmcsObserver = new MutationObserver((mutations, obs) => {
            const domainDiv = document.querySelector('.cpanel-package-details a');
            if (domainDiv && !domainDiv.dataset.processed) {
                obs.disconnect();
                const fullDomain = domainDiv.textContent.trim();
                const domain = fullDomain.replace(/^www\./, '');
                const parentDiv = domainDiv.closest('.cpanel-package-details');
                if (parentDiv) {
                    addDomainInfoPanels(domain, parentDiv);
                }
                domainDiv.dataset.processed = 'true';
            }
        });
        whmcsObserver.observe(document.body, { childList: true, subtree: true });
    }

    /** Lógica para a página de detalhes de domínio do WHMCS. */
    function setupWHMCSDomainDetails() {
        console.log('DMNSToolkit LOADED - WHMCS Domain Details');
        const whmcsObserver = new MutationObserver((mutations, obs) => {
            const domainLink = document.querySelector('#tabOverview.tab-pane a[target="_blank"]');
            if (domainLink && !domainLink.dataset.processed) {
                obs.disconnect();
                const fullDomain = domainLink.textContent.trim();
                const domain = fullDomain.replace(/^www\./, '');
                const parentDiv = domainLink.closest('.well.mx-1');
                if (parentDiv) {
                    addDomainInfoPanels(domain, parentDiv);
                }
                domainLink.dataset.processed = 'true';
            }
        });
        whmcsObserver.observe(document.body, { childList: true, subtree: true });
    }

    /** Lógica para adicionar botões para gerir os Nameservers. */
    function setupRegistrarCommands() {
        console.info("DMNSToolkit LOADED - WHMCS Registrar Details");
        function tryInject() {
            const labelTd = Array.from(document.querySelectorAll('td.fieldlabel'))
                .find(td => td.textContent.trim().includes('Registrar Commands'));

            if (!labelTd) return;

            const targetTd = labelTd.nextElementSibling;
            if (!targetTd || targetTd.dataset.processed) return;

            // Get saved nameservers or defaults
            const savedNS = GM_getValue('defaultNameservers', [
                'dns1.example.com',
                'dns2.example.com',
                'dns3.example.com',
                'dns4.example.com'
            ]);

            // Button: Set NS
            const setNsButton = createButton('Set NS', ICON_COPY, () => {
                // Always get the latest saved values each click, old ones are cached
                const nsValues = GM_getValue('defaultNameservers', [
                    'dns1.example.com',
                    'dns2.example.com',
                    'dns3.example.com',
                    'dns4.example.com'
                ]);

                // Iterate trough the current input inserting the values, stopping at the length of nsValues
                for (let i = 1; i <= nsValues.length; i++) {
                    const input = document.querySelector(`input[name="ns${i}"]`);
                    if (input) input.value = nsValues[i - 1];
                }
            });

            // Button: Edit NS
            const editNsButton = createButton('Edit NS', ICON_EXTERNAL_LINK, () => {
                const current = GM_getValue('defaultNameservers', savedNS);
                const userInput = prompt(
                    'Enter 4 nameservers separated by commas:',
                    current.join(',')
                );
                if (userInput) {
                    const nsArray = userInput.split(',').map(s => s.trim()).filter(Boolean);
                    if (nsArray.length >= 2 && nsArray.length <= 4) {
                        GM_setValue('defaultNameservers', nsArray);
                        console.info('Default nameservers updated!');
                    } else {
                        alert('Please provide at least 2 nameservers, and no more than 4, separated by commas.');
                    }
                }
            });

            // Add buttons to the cell
            targetTd.append(setNsButton, editNsButton);
            targetTd.dataset.processed = 'true';
        }

        // Run now
        tryInject();
        // And on future mutations
        const observer = new MutationObserver(tryInject);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /** Lógica para a página ToDoList do WHMCS. */
    function setupToDoListPage() {
        console.log('DMNSToolkit LOADED - WHMCS ToDoList');
        const descriptionArea = document.querySelector('textarea[name="description"]');

        if (descriptionArea && !descriptionArea.dataset.processed) {
            const text = descriptionArea.value;
            const serviceIdMatch = text.match(/Serviceid:\s*(\d+)/);

            if (serviceIdMatch && serviceIdMatch[1]) {
                const serviceId = serviceIdMatch[1];

                const whmcsButton = createButton(
                    'Pesquisar Serviço no WHMCS',
                    ICON_EXTERNAL_LINK,
                    () => {
                        // Apenas define os valores que serão lidos na nova aba
                        GM_setValue('whmcsSearchType', 'services');
                        GM_setValue('whmcsSearchField', 'Service ID');
                        GM_setValue('whmcsSearchQuery', serviceId);
                    },
                    true, // É uma âncora
                    'https://my.dominios.pt/cp2002/' // Navega para esta página
                );

                const parentElement = descriptionArea.closest('.fieldarea');
                if (parentElement) {
                    const buttonContainer = document.createElement('div');
                    buttonContainer.style.marginTop = '10px';
                    buttonContainer.appendChild(whmcsButton);
                    parentElement.appendChild(buttonContainer);
                }
                descriptionArea.dataset.processed = 'true';
                console.log(`DMNSToolkit: Botão de pesquisa para ServiceID ${serviceId} adicionado.`);
            } else {
                console.log('DMNSToolkit: ServiceID não encontrado na descrição.');
            }
        }
    }

    /** Lógica para a página do cPanel. */
    function setupCPanel() {
        console.log('DMNSToolkit LOADED - cPanel / Ibername');
        // ... (o resto da função cPanel permanece inalterado)
        const cpanelObserver = new MutationObserver((mutations, obs) => {
            const ipSpan = document.querySelector('span#txtIPAddress.general-info-value');
            const domainNameSpan = document.querySelector('div#txtDomainName.general-info-value');
            if (ipSpan && domainNameSpan && !ipSpan.dataset.processed) {
                obs.disconnect();
                const domainName = domainNameSpan.textContent.trim();
                const parentTable = domainNameSpan.closest('table');
                if (parentTable) {
                    // --- DIG NS e IP ---
                    const ipAddress = ipSpan.textContent.trim();
                    const ipParentRow = ipSpan.closest('tr');
                    const domainParentRow = domainNameSpan.closest('tr');

                    if (ipParentRow) {
                        const ipResultsRow = document.createElement('tr');
                        const ipResultsCell = document.createElement('td');
                        ipResultsCell.colSpan = 2;
                        ipResultsCell.style.padding = '0 10px 10px 10px';
                        const ipResultsWrapper = document.createElement('div');
                        ipResultsWrapper.style.cssText = `display: flex; align-items: center;`;
                        const ipResultsContainer = createResultsContainer();
                        ipResultsContainer.style.flexGrow = '1';
                        ipResultsContainer.style.marginTop = '0';
                        ipResultsWrapper.appendChild(ipResultsContainer);
                        const ptrQuery = ipAddress.split('.').reverse().join('.') + '.in-addr.arpa';
                        fetch(`https://cloudflare-dns.com/dns-query?name=${ptrQuery}&type=PTR`, { headers: { 'Accept': 'application/dns-json' } })
                            .then(response => response.json())
                            .then(data => {
                                const hostname = data.Answer && data.Answer[0] ? data.Answer[0].data.slice(0, -1) : 'Não encontrado';
                                ipResultsContainer.innerHTML = `<strong>dig -x ${ipAddress}:</strong><br/>${hostname}.`;
                                const copyHostnameButton = createButton('', ICON_COPY, () => {
                                    GM_setClipboard(hostname, 'text');
                                    showCopyNotification(copyHostnameButton);
                                });
                                ipResultsWrapper.appendChild(copyHostnameButton);
                            });
                        ipResultsCell.appendChild(ipResultsWrapper);
                        ipResultsRow.appendChild(ipResultsCell);
                        ipParentRow.after(ipResultsRow);
                    }
                    if (domainParentRow) {
                        const domainResultsRow = document.createElement('tr');
                        const domainResultsCell = document.createElement('td');
                        domainResultsCell.colSpan = 2;
                        domainResultsCell.style.padding = '0 10px 10px 10px';
                        const domainResultsWrapper = document.createElement('div');
                        domainResultsWrapper.style.cssText = `display: flex; align-items: center;`;
                        const domainResultsContainer = createResultsContainer();
                        domainResultsContainer.style.flexGrow = '1';
                        domainResultsContainer.style.marginTop = '0';
                        domainResultsWrapper.appendChild(domainResultsContainer);
                        fetch(`https://cloudflare-dns.com/dns-query?name=${domainName}&type=NS`, { headers: { 'Accept': 'application/dns-json' } })
                            .then(response => response.json())
                            .then(data => {
                                const nameservers = data.Answer ? data.Answer.map(rec => rec.data.slice(0, -1)).join('\n') : 'Não encontrado';
                                domainResultsContainer.innerHTML = `<strong>dig ns ${domainName}:</strong><br>${nameservers}.`;
                                const copyNsButton = createButton('', ICON_COPY, () => {
                                    GM_setClipboard(nameservers, 'text');
                                    showCopyNotification(copyNsButton);
                                });
                                domainResultsWrapper.appendChild(copyNsButton);
                            });
                        domainResultsCell.appendChild(domainResultsWrapper);
                        domainResultsRow.appendChild(domainResultsCell);
                        domainParentRow.after(domainResultsRow);
                    }

                    // --- Análise de Email ---
                    const newRow = document.createElement('tr');
                    const newCell = document.createElement('td');
                    newCell.colSpan = 2;
                    newCell.style.padding = '0 10px 10px 10px';
                    const emailSectionContainer = document.createElement('div');
                    emailSectionContainer.style.cssText = `
                        background-color: #222; padding: 10px; border-radius: 5px; color: white;
                    `;
                    const emailHeader = document.createElement('h4');
                    emailHeader.textContent = 'Análise de Email';
                    emailHeader.style.color = 'white';
                    emailHeader.style.marginBottom = '5px';
                    emailSectionContainer.appendChild(emailHeader);
                    const recordsContainer = createResultsContainer(false);
                    recordsContainer.style.marginTop = '0';
                    emailSectionContainer.appendChild(recordsContainer);
                    const types = ['MX', 'TXT', '_dmarc', 'default._domainkey'];
                    const promises = types.map(type => {
                        let queryName = domainName;
                        if (type === '_dmarc') queryName = `_dmarc.${domainName}`;
                        if (type === 'default._domainkey') queryName = `default._domainkey.${domainName}`;
                        return fetch(`https://cloudflare-dns.com/dns-query?name=${queryName}&type=${type === 'TXT' ? 'TXT' : (type === 'MX' ? 'MX' : 'TXT')}`, { headers: { 'Accept': 'application/dns-json' } })
                            .then(res => res.json())
                            .then(data => ({ type, data }))
                            .catch(e => ({ type, error: e }));
                    });
                    Promise.allSettled(promises)
                        .then(results => {
                            let output = '';
                            results.forEach(result => {
                                if (result.status === 'fulfilled' && result.value.data.Answer) {
                                    const records = result.value.data.Answer.map(rec => {
                                        if (result.value.type === 'MX') {
                                            return `${rec.data.slice(0, -1)} (Prioridade ${rec.data.match(/(\d+) /)?.[1] || 'n/a'})`;
                                        }
                                        return rec.data;
                                    }).join('\n');
                                    output += `[${result.value.type}]:\n${records.replace(/"/g, '')}\n\n`;
                                } else {
                                    output += `[${result.value.type}]:\nNão encontrado\n\n`;
                                }
                            });
                            recordsContainer.textContent = output.trim() || 'Sem registos de email encontrados.';
                            const copyButton = createButton('Copiar Registos', ICON_COPY, () => {
                                GM_setClipboard(output.trim(), 'text');
                                showCopyNotification(copyButton);
                            });
                            emailSectionContainer.appendChild(copyButton);
                        });
                    const mailTesterButton = createButton('Testar no Mail-Tester.com', ICON_EXTERNAL_LINK, null, true, 'https://www.mail-tester.com/');
                    emailSectionContainer.appendChild(mailTesterButton);
                    newCell.appendChild(emailSectionContainer);
                    newRow.appendChild(newCell);
                    parentTable.appendChild(newRow);
                }
                ipSpan.dataset.processed = 'true';
            }
        });
        cpanelObserver.observe(document.body, { childList: true, subtree: true });
    }

    // --- Roteador Principal ---
    const currentPage = window.location.href;
    switch (true) {
        case currentPage.includes('suporte.dominios.pt/staff/'):
            setupKayako();
            break;
        case currentPage.includes('my.dominios.pt/cp2002/todolist.php?action=edit'):
            setupToDoListPage();
            break;
        case currentPage.includes('my.dominios.pt/cp2002/clientsdomains.php'):
            setupRegistrarCommands();
            break;
        case currentPage.includes('my.dominios.pt/cp2002/'):
            setupWHMCSAdmin();
            break;
        case currentPage.includes('my.dominios.pt/clientarea.php?action=productdetails'):
            setupWHMCSProductDetails();
            break;
        case currentPage.includes('my.dominios.pt/clientarea.php?action=domaindetails'):
            setupWHMCSDomainDetails();
            break;
        case currentPage.includes('dnscpanel.com'):
        case currentPage.includes('ibername.com'):
            setupCPanel();
            break;
        default:
            console.log('DMNSToolkit: No valid page detected.');
            break;
    }
})();
