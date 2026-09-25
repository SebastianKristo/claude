// Mock for kd-media-card – gjenskaper designets eksempelverdier (Media.dc.html).
(() => {
  const SRC_TV = ['Plex', 'NRK TV', 'Telia Play', 'TV 2 Play', 'YouTube', 'Netflix', 'Apple TV+'];
  MOCK.add({
    'media_player.stue_tv': { state: 'off', attributes: { friendly_name: 'Stue TV', volume_level: 0.24, is_volume_muted: false, supported_features: 0x3fff, source_list: SRC_TV } },
    'remote.stue_tv': 'on',
    'media_player.google_tv': { state: 'off', attributes: { friendly_name: 'Google TV' } },
    'media_player.squeezebox_radio': { state: 'idle', attributes: { friendly_name: 'Sonos', volume_level: 0.30, source: 'Spotify', group_members: ['media_player.squeezebox_radio', 'media_player.kjokken_radio'] } },
    'media_player.kjokken_radio': { state: 'idle', attributes: { friendly_name: 'Kjøkken radio', volume_level: 0.22, group_members: ['media_player.squeezebox_radio', 'media_player.kjokken_radio'] } },
    'media_player.rn602_stue': { state: 'off', attributes: { friendly_name: 'RN602 Stue', volume_level: 0.15, group_members: ['media_player.rn602_stue'], source_list: ['AirPlay', 'Net Radio', 'Spotify', 'Bluetooth', 'CD', 'Phono', 'Optical1', 'Tuner'] } },
    // bare for sammenligning med designets fire høyttalere (Stue, Kjøkken, Bad, Kontor)
    'media_player.mock_kontor': { state: 'off', attributes: { friendly_name: 'Kontor', volume_level: 0.35, group_members: ['media_player.mock_kontor'] } },
    'button.squeezebox_radio_preset_1': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 1' } },
    'button.squeezebox_radio_preset_2': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 2' } },
    'button.squeezebox_radio_preset_3': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 3' } },
    'button.squeezebox_radio_preset_4': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 4' } },
    'button.squeezebox_radio_preset_5': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 5' } },
    'button.squeezebox_radio_preset_6': { state: 'unknown', attributes: { friendly_name: 'Sonos Preset 6' } },
    'sensor.tv_seertid_i_dag': { state: '1.4', attributes: { unit_of_measurement: 'h' } },
    'sensor.tv_seertid_denne_maned': { state: '31.2', attributes: { unit_of_measurement: 'h' } },
  });
})();
