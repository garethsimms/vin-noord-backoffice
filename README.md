# Vin Noord Backoffice

A lightweight launchpad for Vin Noord's internal tools.

## Current tools
- B2B Invoicing — Google Apps Script web app
- Direct link to the underlying Google Sheet for maintenance

## Deploy
This is a static site. Connect this repository to Netlify with:
- Build command: none
- Publish directory: `.`

Then add `backoffice.vin-noord.nl` as the custom domain. DNS is managed at Hostnet.

## Adding a tool
Add another card in `index.html`. Keep credentials and secrets out of this repository.
