// Mock for kd-media-card – gjenskaper designets eksempelverdier (Media v3.dc.html).
// For 1:1-sammenligning med designet: --cfg med hoyttalere[0].navn 'Stue' og designets apper (NRK TV, Netflix, YouTube, Max, Disney+, TV 2 Play).
(() => {
  const SRC_TV = ['Plex', 'NRK TV', 'Telia Play', 'TV 2 Play', 'YouTube', 'Netflix', 'Max', 'Disney+', 'Apple TV+'];
  MOCK.add({
    'media_player.stue_tv': { state: 'playing', attributes: { friendly_name: 'Stue TV', device_class: 'tv', volume_level: 0.14, is_volume_muted: false, supported_features: 0x3fff,
      source_list: SRC_TV, source: 'NRK TV', app_name: 'NRK TV', media_title: 'Dagsrevyen', media_channel: 'NRK1 · direkte' } },
    'remote.stue_tv': { state: 'on', attributes: { friendly_name: 'Apple TV' } },
    'media_player.google_tv': { state: 'off', attributes: { friendly_name: 'Google TV' } },
    'media_player.squeezebox_radio': { state: 'playing', attributes: { friendly_name: 'Stue', volume_level: 0.14, source: 'Net Radio', supported_features: 0x3fff | 32768 | 262144 | 524288, shuffle: false, repeat: 'off',
      media_title: 'Morgenmiks: Adress Rosenhill, Alice Wirak', media_channel: 'NRK P1+',
      source_list: ['Spotify', 'AirPlay', 'Net Radio', 'Bluetooth'], group_members: ['media_player.squeezebox_radio'] } },
    'media_player.kjokken_radio': { state: 'off', attributes: { friendly_name: 'Kjøkken radio', volume_level: 0.22, group_members: ['media_player.kjokken_radio'] } },
    'media_player.rn602_stue': { state: 'off', attributes: { friendly_name: 'RN602 Stue', volume_level: 0.15, group_members: ['media_player.rn602_stue'], source_list: ['AirPlay', 'Net Radio', 'Spotify', 'Bluetooth', 'CD', 'Phono', 'Optical1', 'Tuner'] } },
    'button.squeezebox_radio_preset_1': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 1' } },
    'button.squeezebox_radio_preset_2': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 2' } },
    'button.squeezebox_radio_preset_3': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 3' } },
    'button.squeezebox_radio_preset_4': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 4' } },
    'button.squeezebox_radio_preset_5': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 5' } },
    'button.squeezebox_radio_preset_6': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 6' } },
    // for volumknappene i «Tilpass oppsett»
    'script.tv_volum_opp': { state: 'off', attributes: { friendly_name: 'TV volum opp' } },
    'script.tv_volum_ned': { state: 'off', attributes: { friendly_name: 'TV volum ned' } },
    'script.tv_demp': { state: 'off', attributes: { friendly_name: 'TV demp' } },
    'scene.kinokveld': { state: 'unknown', attributes: { friendly_name: 'Kinokveld' } },
  });
})();
