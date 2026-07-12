// FTN Platform Website — generic ad-panel renderer.
// Knows nothing about any specific campaign; only how to turn a campaign
// object from js/ads-data.js into markup for a given placement.
(function (global) {
  'use strict';

  function lockupSVG(headline) {
    var upper = headline.toUpperCase();
    // viewBox width is computed from the actual headline, not hardcoded —
    // a fixed width clipped any campaign headline longer than "FACE THE
    // NATION" (found via the Community Connect house-ad swap, which clipped
    // to "COMMUNITY CONN"). Advance width is an estimate for Montserrat
    // Bold at font-size 15 with 0.5 letter-spacing; generous enough that a
    // real word never clips, at the cost of sometimes a little extra
    // trailing space, which is the safe direction to be wrong in.
    var textWidth = upper.length * 10.5;
    var totalWidth = Math.max(220, 62 + textWidth + 10);
    var displayWidth = Math.round(180 * (totalWidth / 220));
    return (
      '<svg viewBox="0 0 ' + totalWidth + ' 40" width="' + displayWidth + '" height="33" role="img" aria-labelledby="adLogoTitle">' +
        '<title id="adLogoTitle">FTN Platform — ' + headline + '</title>' +
        '<text x="0" y="26" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="24" fill="#E10613">FTN</text>' +
        '<line x1="52" y1="6" x2="52" y2="32" stroke="#3A3A3A" stroke-width="1"></line>' +
        '<text x="62" y="25" font-family="Montserrat, Arial, sans-serif" font-weight="700" font-size="15" letter-spacing="0.5" fill="#FFFFFF">' + upper + '</text>' +
      '</svg>'
    );
  }

  function panelHTML(campaign) {
    var creative = campaign.creativeType === 'image' && campaign.imageUrl
      ? '<img class="ad-rail__image" src="' + campaign.imageUrl + '" alt="' + campaign.headline + '">'
      : lockupSVG(campaign.headline);

    return (
      '<div class="ad-rail" data-ad-id="' + campaign.id + '">' +
        '<p class="ad-rail__label">' + (campaign.messageType || 'Advertisement') + '</p>' +
        '<div class="ad-rail__logo">' + creative + '</div>' +
        '<p class="ad-rail__tagline">' + campaign.sponsorLabel + '.<br>' + campaign.tagline + '</p>' +
        '<div class="u-mt-24">' +
          '<a class="btn btn-primary btn-sm" href="' + campaign.ctaHref + '">' + campaign.ctaLabel + '</a>' +
        '</div>' +
      '</div>'
    );
  }

  function renderPlacement(containerId, placement) {
    var mount = document.getElementById(containerId);
    if (!mount || !global.FTN || !global.FTN.getAdsForPlacement) return;
    var campaigns = global.FTN.getAdsForPlacement(placement);
    if (!campaigns.length) {
      mount.innerHTML = '';
      return;
    }
    // One panel per placement in this phase; kioskRotation-eligible campaigns
    // are the pool a future rotation timer would cycle through.
    mount.innerHTML = panelHTML(campaigns[0]);
  }

  global.FTN = global.FTN || {};
  global.FTN.Ads = { renderPlacement: renderPlacement };
})(window);
