// ==UserScript==
// @name         DMNSToolkit
// @namespace    http://tampermonkey.net/
// @version      v1.0
// @description  Conjunto de utilidades para as plataformas DMNS - Kayako, WHMCS, cPanel.
// @author       FXVNDER (fxvnder.com)
// @match        https://suporte.dominios.pt/staff/*
// @match        https://my.dominios.pt/cp2002/*
// @match        https://*.dnscpanel.com/*
// @match        https://my.dominios.pt/clientarea.php?action=productdetails&id=*
// @run-at       document-end
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    // --- Ícones SVG ---
    const ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`;
    const ICON_EXTERNAL_LINK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>`;

    // --- Funções de Ajuda ---

    /** Cria um ícone SVG. */
    function createIcon(svgString) {
        const span = document.createElement('span');
        span.innerHTML = svgString;
        span.style.verticalAlign = 'middle';
        span.style.marginRight = '4px';
        return span;
    }

    /** Cria um botão */
    function createButton(text, icon, clickHandler, isAnchor = false, href = '#') {
        const button = isAnchor ? document.createElement('a') : document.createElement('button');

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
        } else {
            button.onclick = clickHandler;
        }

        return button;
    }

    /** Notificação "Copiado!" */
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

    /** Lógica para a página do Kayako. */
    function setupKayako() {
        console.log('DMNSToolkit LOADED - Kayako');

        function addButtonsToTickets() {
            const targetElements = document.querySelectorAll('.ticketpostbottomcontents');
            const emailRegex = /Email: ([\w.-]+@[\w.-]+\.\w+)/;

            targetElements.forEach((element) => {
                if (element.dataset.processed) {
                    return;
                }

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

                    const whmcsButton = createButton('Abrir WHMCS', ICON_EXTERNAL_LINK, null, true, 'https://my.dominios.pt/cp2002/');
                    whmcsButton.onclick = () => GM_setValue('clienteEmail', email);

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

    /** Lógica para a página de login do WHMCS. */
    function setupWHMCSLogin() {
        console.log('DMNSToolkit LOADED - WHMCS');
        setTimeout(() => {
            const email = GM_getValue('clienteEmail', null);
            if (!email) {
                console.log('DMNSToolkit: Nenhum email para pesquisar.');
                return;
            }

            const searchField = document.getElementById('searchfield');
            const searchInput = document.querySelector('input[name="q"]');
            const searchButton = document.querySelector('input[type="submit"][value="Search"]');

            if (searchField && searchInput && searchButton) {
                searchField.value = "Email Address";
                searchInput.value = email;
                searchButton.click();
                console.log('DMNSToolkit: Pesquisa no WHMCS iniciada.');
                GM_deleteValue('clienteEmail');
            } else {
                console.error("DMNSToolkit: Elementos de pesquisa não encontrados.");
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

                // tira o "www." do dominio
                const fullDomain = domainDiv.textContent.trim();
                const domain = fullDomain.replace(/^www\./, '');

                const parentDiv = domainDiv.closest('.cpanel-package-details');

                if (parentDiv) {
                    // --- DIG NS ---
                    const digNsHeader = document.createElement('h4');
                    digNsHeader.textContent = 'DIG Nameservers';
                    digNsHeader.style.marginTop = '15px';
                    parentDiv.after(digNsHeader);

                    const digNsContainer = document.createElement('div');
                    digNsContainer.style.cssText = 'display: flex; align-items: center;';
                    digNsHeader.after(digNsContainer);

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
                            digNsResultsContainer.textContent = `Erro ao consultar: ${e.message}`;
                            digNsResultsContainer.style.color = 'red';
                        });

                    // --- WHOIS ---
                    const whoisHeader = document.createElement('h4');
                    whoisHeader.textContent = 'WHOIS';
                    whoisHeader.style.marginTop = '15px';
                    digNsContainer.after(whoisHeader);

                    const whoisLinksContainer = document.createElement('div');
                    whoisLinksContainer.style.cssText = 'margin-top: 5px; display: flex; gap: 8px; flex-wrap: wrap;';
                    whoisHeader.after(whoisLinksContainer);

                    const whoisSites = {
                        'Who.is': `https://who.is/whois/${domain}`,
                        'DomainTools': `https://whois.domaintools.com/${domain}`,
                        'Whois.com': `https://whois.com/whois/${domain}`,
                    };

                    for (const [site, url] of Object.entries(whoisSites)) {
                        const whoisButton = createButton(site, ICON_EXTERNAL_LINK, null, true, url);
                        whoisLinksContainer.appendChild(whoisButton);
                    }
                }
                domainDiv.dataset.processed = 'true';
            }
        });

        whmcsObserver.observe(document.body, { childList: true, subtree: true });
    }

    /** Lógica para a página do cPanel. */
    function setupCPanel() {
        console.log('DMNSToolkit LOADED - cPanel');

        const cpanelObserver = new MutationObserver((mutations, obs) => {
            const ipSpan = document.querySelector('span#txtIPAddress.general-info-value');
            const domainNameSpan = document.querySelector('div#txtDomainName.general-info-value');

            if (ipSpan && domainNameSpan && !ipSpan.dataset.processed) {
                obs.disconnect();

                // IP e dig -x
                const ipAddress = ipSpan.textContent.trim();
                const ipParentRow = ipSpan.closest('tr');

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
                        })
                        .catch(() => {
                            ipResultsContainer.textContent = `Erro ao consultar dig -x para ${ipAddress}.`;
                            ipResultsContainer.style.color = 'red';
                        });

                    ipResultsCell.appendChild(ipResultsWrapper);
                    ipResultsRow.appendChild(ipResultsCell);
                    ipParentRow.after(ipResultsRow);
                }

                // Domínio e Nameservers
                const domainName = domainNameSpan.textContent.trim();
                const domainParentRow = domainNameSpan.closest('tr');

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
                        })
                        .catch(() => {
                            domainResultsContainer.textContent = `Erro ao consultar dig ns para ${domainName}.`;
                            domainResultsContainer.style.color = 'red';
                        });

                    domainResultsCell.appendChild(domainResultsWrapper);
                    domainResultsRow.appendChild(domainResultsCell);
                    domainParentRow.after(domainResultsRow);
                }

                ipSpan.dataset.processed = 'true';
            }
        });

        cpanelObserver.observe(document.body, { childList: true, subtree: true });
    }

    // --- Main ---
    const currentPage = window.location.href;
    switch (true) {
        case currentPage.includes('suporte.dominios.pt/staff/'):
            setupKayako();
            break;
        case currentPage.includes('my.dominios.pt/cp2002/'):
            setupWHMCSLogin();
            break;
        case currentPage.includes('my.dominios.pt/clientarea.php?action=productdetails'):
            setupWHMCSProductDetails();
            break;
        case currentPage.includes('dnscpanel.com'):
            setupCPanel();
            break;
        default:
            console.log('DMNSToolkit: No valid page detected.');
            break;
    }
})();