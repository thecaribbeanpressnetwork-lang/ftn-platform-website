// FTN Platform Website — Relationship Registry data.
//
// One FTN-owned source of truth for commercial, support and provider relationships.
// This is intentionally small: only relationships FTN already uses or explicitly supports
// belong here. Unknown affiliate status stays 'unverified' until independently confirmed.
(function (global) {
  'use strict';

  var RELATIONSHIPS = [
    {
      id: 'vidiq',
      name: 'vidIQ',
      relationshipType: 'affiliate',
      status: 'confirmed',
      publicUrl: 'https://vidiq.com/FaceTheNationtt',
      disclosure: 'FTN may earn a referral commission if you subscribe through this link.',
      capabilities: ['youtube-research', 'keyword-research', 'channel-analytics', 'video-discovery'],
      ecosystemUses: ['radio', 'face-the-nation', 'kaiso', 'opportunities', 'ibis-ai'],
      ownership: 'external-provider',
      providerClass: 'connected-provider'
    },
    {
      id: 'patreon',
      name: 'Patreon',
      relationshipType: 'support',
      status: 'confirmed',
      publicUrl: 'https://www.patreon.com/cw/FTNPlatform',
      disclosure: 'Patreon is an external membership and support service for FTN Platform.',
      capabilities: ['membership', 'support'],
      ecosystemUses: ['platform'],
      ownership: 'external-provider',
      providerClass: 'external-provider'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      relationshipType: 'supported-destination',
      status: 'supported',
      publicUrl: 'https://www.youtube.com/',
      disclosure: '',
      capabilities: ['video-hosting', 'creator-channels', 'playlists', 'embedded-playback'],
      ecosystemUses: ['radio', 'screen', 'face-the-nation', 'riddim'],
      ownership: 'external-provider',
      providerClass: 'external-provider'
    },
    {
      id: 'spotify',
      name: 'Spotify',
      relationshipType: 'supported-destination',
      status: 'supported',
      publicUrl: 'https://www.spotify.com/',
      disclosure: '',
      capabilities: ['music-streaming', 'creator-destination'],
      ecosystemUses: ['radio', 'riddim'],
      ownership: 'external-provider',
      providerClass: 'external-provider'
    },
    {
      id: 'beatstars',
      name: 'BeatStars',
      relationshipType: 'supported-destination',
      status: 'affiliate-unverified',
      publicUrl: 'https://www.beatstars.com/',
      disclosure: '',
      capabilities: ['beat-marketplace', 'creator-storefront'],
      ecosystemUses: ['riddim', 'radio', 'ftn-link'],
      ownership: 'external-provider',
      providerClass: 'external-provider'
    },
    {
      id: 'openart',
      name: 'OpenArt',
      relationshipType: 'connected-provider',
      status: 'connected',
      publicUrl: 'https://openart.ai/',
      disclosure: '',
      capabilities: ['image-generation', 'video-generation'],
      ecosystemUses: ['creative-engine'],
      ownership: 'external-provider',
      providerClass: 'connected-provider'
    },
    {
      id: 'runway',
      name: 'Runway',
      relationshipType: 'connected-provider',
      status: 'connected',
      publicUrl: 'https://runwayml.com/',
      disclosure: '',
      capabilities: ['image-generation', 'video-generation', 'video-editing'],
      ecosystemUses: ['creative-engine'],
      ownership: 'external-provider',
      providerClass: 'connected-provider'
    },
    {
      id: 'heygen',
      name: 'HeyGen',
      relationshipType: 'connected-provider',
      status: 'connected',
      publicUrl: 'https://www.heygen.com/',
      disclosure: '',
      capabilities: ['avatar-video', 'speech', 'translation', 'lip-sync'],
      ecosystemUses: ['creative-engine'],
      ownership: 'external-provider',
      providerClass: 'connected-provider'
    },
    {
      id: 'veed',
      name: 'VEED',
      relationshipType: 'connected-provider',
      status: 'connected',
      publicUrl: 'https://www.veed.io/',
      disclosure: '',
      capabilities: ['video-generation'],
      ecosystemUses: ['creative-engine'],
      ownership: 'external-provider',
      providerClass: 'connected-provider'
    },
    {
      id: 'blitzreels',
      name: 'BlitzReels',
      relationshipType: 'connected-provider',
      status: 'connected',
      publicUrl: '',
      disclosure: '',
      capabilities: ['short-video', 'clip-generation', 'captions', 'social-video'],
      ecosystemUses: ['creative-engine', 'face-the-nation', 'kaiso'],
      ownership: 'external-provider',
      providerClass: 'connected-provider'
    }
  ];

  global.FTN = global.FTN || {};
  global.FTN.RelationshipRegistryData = RELATIONSHIPS;
})(window);
