// Mock for kd-media-card – gjenskaper designets eksempelverdier (Media.dc.html).
(() => {
  const SRC_TV = ['Plex', 'NRK TV', 'Telia Play', 'TV 2 Play', 'YouTube', 'Netflix', 'Apple TV+'];
  // albumbilde uten nett: SVG som data-URI
  const svg = (body) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">${body}</svg>`);
  const COVER = svg('<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a59"/><stop offset=".55" stop-color="#c2366b"/><stop offset="1" stop-color="#3b1f6b"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><circle cx="210" cy="95" r="52" fill="#ffd27a" opacity=".9"/><path d="M0 230 Q80 170 150 215 T300 200 V300 H0Z" fill="#1d1238" opacity=".85"/>');
  const LOGO = svg('<rect width="300" height="300" fill="#0b5fa5"/><text x="150" y="185" font-family="Arial" font-weight="700" font-size="120" fill="#fff" text-anchor="middle">P24</text>');
  MOCK.add({
    'media_player.stue_tv': { state: 'off', attributes: { friendly_name: 'Stue TV', volume_level: 0.24, is_volume_muted: false, supported_features: 0x3fff, source_list: SRC_TV } },
    'remote.stue_tv': 'on',
    'media_player.google_tv': { state: 'off', attributes: { friendly_name: 'Google TV' } },
    'media_player.squeezebox_radio': { state: 'playing', attributes: { friendly_name: 'Sonos', volume_level: 0.30, source: 'Spotify', supported_features: 0x3fff | 32768 | 262144 | 524288, shuffle: true, repeat: 'off',
      media_title: 'Midnight City', media_artist: 'M83', media_album_name: 'Hurry Up, We\'re Dreaming', media_channel: 'NRK P1', entity_picture: COVER,
      media_duration: 243, media_position: 71, media_position_updated_at: new Date().toISOString(),
      source_list: ['Spotify', 'AirPlay', 'Net Radio', 'Bluetooth'], group_members: ['media_player.squeezebox_radio', 'media_player.kjokken_radio'] } },
    'media_player.kjokken_radio': { state: 'playing', attributes: { friendly_name: 'Kjøkken radio', volume_level: 0.22, group_members: ['media_player.squeezebox_radio', 'media_player.kjokken_radio'] } },
    'media_player.rn602_stue': { state: 'off', attributes: { friendly_name: 'RN602 Stue', volume_level: 0.15, group_members: ['media_player.rn602_stue'], source_list: ['AirPlay', 'Net Radio', 'Spotify', 'Bluetooth', 'CD', 'Phono', 'Optical1', 'Tuner'] } },
    // bare for sammenligning med designets fire høyttalere (Stue, Kjøkken, Bad, Kontor)
    'media_player.mock_kontor': { state: 'off', attributes: { friendly_name: 'Kontor', volume_level: 0.35, group_members: ['media_player.mock_kontor'] } },
    'button.squeezebox_radio_preset_1': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 1' } },
    'button.squeezebox_radio_preset_2': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 2' } },
    'button.squeezebox_radio_preset_3': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 3' } },
    'button.squeezebox_radio_preset_4': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 4', entity_picture: LOGO } },
    'button.squeezebox_radio_preset_5': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 5' } },
    'button.squeezebox_radio_preset_6': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 6' } },
    // for volumknappene i «Tilpass oppsett»
    'script.tv_volum_opp': { state: 'off', attributes: { friendly_name: 'TV volum opp' } },
    'script.tv_volum_ned': { state: 'off', attributes: { friendly_name: 'TV volum ned' } },
    'script.tv_demp': { state: 'off', attributes: { friendly_name: 'TV demp' } },
    'scene.kinokveld': { state: 'unknown', attributes: { friendly_name: 'Kinokveld' } },
    'sensor.tv_seertid_i_dag': { state: '1.4', attributes: { unit_of_measurement: 'h' } },
    'sensor.tv_seertid_denne_maned': { state: '31.2', attributes: { unit_of_measurement: 'h' } },
  });
})();
