# TBToolkit
Conjunto de utilidades para as plataformas TB (DMNS, PTISP - Kayako, WHMCS, cPanel)

# Features

## Kayako

<img width="1064" height="239" alt="image" src="https://github.com/user-attachments/assets/ade62cef-ef34-4535-8963-5e08e4178e14" />

- Copiar E-Mail

- Abrir WHMCS (ao abrir a página, ele auto-preenche o email e pesquisa)

- Abrir Área de cliente

## WHMCS

<img width="654" height="826" alt="image" src="https://github.com/user-attachments/assets/a01f3022-7a03-4503-a4b6-ab4bcc09a903" />

- Print dos NS + registos DNS

- Ferramenta whois + whois pt.pt

<img width="664" height="561" alt="image" src="https://github.com/user-attachments/assets/c0076ff0-989b-4503-b4a5-b55f7a376891" />

- TDL -> WHMCS ServiceID

## cPanel

<img width="1346" height="737" alt="image" src="https://github.com/user-attachments/assets/a1033c8b-6d19-46ee-8f9c-ce31393dae0c" />

- nameservers

- dig -x (IP)

- Análise Email -> registos DNS - MX, TXT (SPF), DMARC, DKIM

# Instalação

  1. Instalar extensão no browser que permita utilizar scripts (Greasemonkey, Tampermonkey, etc.)
  2. Importar ficheiro JS deste GitHub / Clicar em "Raw" no ficheiro JS acima.
  3. Profit 💰

Changelog:

v1:
- Suporte Kayako (clipboards, abrir whmcs/clientarea), WHMCS (dig+whois), cPanel (nameservers, dig -x)

v2:
- WHMCS (whois+whoispt; TDL), cPanel (análise email)
- Rework (DIG/WHOIS)
