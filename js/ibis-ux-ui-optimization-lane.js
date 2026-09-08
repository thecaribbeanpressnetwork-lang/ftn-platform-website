// FTN Platform — dedicated UX/UI Optimization capability lane for ibis.
// Discovery/planning registry only. No external tool listed here is executable until separately
// integrated, permissioned and tested. Behavioral/session data must respect consent and privacy.
(function(global){
  'use strict';
  var FTN=global.FTN=global.FTN||{};
  var VERIFIED_AT='2026-09-07';
  var lane={
    id:'UX_UI_OPTIMIZATION',
    goal:'Continuously evaluate and improve usability, accessibility, visual quality, interaction reliability, performance and conversion without reducing the product to generic dashboard conventions.',
    integrationState:'DISCOVERY_ONLY',
    capabilities:[
      'UX_HEURISTIC_AUDIT','UI_VISUAL_AUDIT','ACCESSIBILITY_AUDIT','RESPONSIVE_AUDIT','INTERACTION_AUDIT',
      'VISUAL_REGRESSION','CROSS_BROWSER_TEST','PERFORMANCE_AUDIT','CORE_WEB_VITALS','CONVERSION_FRICTION',
      'FUNNEL_ANALYSIS','FORM_FRICTION','SESSION_REPLAY_ANALYSIS','HEATMAP_ANALYSIS','RAGE_CLICK_DETECT',
      'DEAD_CLICK_DETECT','SCROLL_DEPTH_ANALYSIS','TASK_COMPLETION_TEST','NAVIGATION_FRICTION','INFORMATION_ARCHITECTURE',
      'DESIGN_SYSTEM_CONSISTENCY','TYPOGRAPHY_AUDIT','COLOR_CONTRAST','SPACING_RHYTHM','VISUAL_HIERARCHY',
      'MOTION_AUDIT','COGNITIVE_LOAD','CONTENT_CLARITY','CTA_CLARITY','EMPTY_STATE_AUDIT','ERROR_STATE_AUDIT',
      'ONBOARDING_AUDIT','MOBILE_USABILITY','TOUCH_TARGET_AUDIT','KEYBOARD_NAVIGATION','SCREEN_READER_FLOW',
      'A_B_TEST_DESIGN','EXPERIMENT_ANALYSIS','SCREENSHOT_COMPARE','COMPONENT_TEST','USER_JOURNEY_MAP',
      'HEADSPACE_COLLISION_AUDIT','HEADSPACE_ATTENTION_AUDIT','HEADSPACE_RESIZE_AUDIT','HEADSPACE_MATERIALIZATION_AUDIT'
    ],
    candidateStack:[
      {name:'Playwright',role:'browser interaction, responsive, cross-browser and task-flow testing',access:'OPEN_SOURCE'},
      {name:'Lighthouse',role:'performance, accessibility and web-quality auditing',access:'OPEN_SOURCE'},
      {name:'axe-core',role:'automated accessibility rules and regression checks',access:'OPEN_SOURCE'},
      {name:'Pa11y',role:'scriptable accessibility testing',access:'OPEN_SOURCE'},
      {name:'Storybook',role:'component isolation, states and design-system regression',access:'OPEN_SOURCE'},
      {name:'BackstopJS',role:'visual regression screenshot comparison',access:'OPEN_SOURCE'},
      {name:'WebPageTest',role:'deep performance and loading analysis',access:'FREE_OR_OPEN_OPTIONS_VERIFY_AT_USE'},
      {name:'OpenReplay',role:'self-hosted session replay, heatmaps, rage-click/friction context and product analytics',access:'OPEN_SOURCE_SELF_HOST'},
      {name:'PostHog',role:'product analytics, funnels, feature flags, experiments and session replay',access:'OPEN_SOURCE_OR_FREE_TIER_VERIFY_AT_USE'},
      {name:'Matomo',role:'privacy-focused analytics; heatmap/session features may require paid add-on',access:'OPEN_SOURCE_CORE_PLUS_OPTIONAL_PAID'},
      {name:'Umami',role:'lightweight privacy-focused web analytics',access:'OPEN_SOURCE_SELF_HOST'},
      {name:'rrweb',role:'low-level browser session recording/replay building block',access:'OPEN_SOURCE'},
      {name:'Chrome DevTools Protocol',role:'layout, network, performance, runtime and accessibility inspection',access:'BROWSER_NATIVE'},
      {name:'W3C WCAG / ARIA guidance',role:'accessibility standards baseline',access:'OPEN_STANDARD'}
    ],
    evaluationDimensions:[
      'task success','time to first useful result','time on task','error rate','recovery rate','number of unnecessary decisions',
      'attention competition','visual hierarchy','readability','contrast','responsive integrity','keyboard usability','screen-reader semantics',
      'perceived latency','actual latency','layout stability','interaction latency','conversion completion','form abandonment','rage/dead clicks',
      'discoverability','learnability','memory burden','content comprehension','consistency','trust/provenance visibility','aesthetic quality'
    ],
    headspaceSpecificRules:[
      'Do not optimize Headspace into a conventional dashboard merely because dashboard layouts score predictably.',
      'Thoughts must avoid collisions and recover safely when viewport or content size changes.',
      'Resize must improve information density/detail rather than merely enlarge a rectangle.',
      'Pinned thoughts retain user spatial intent; automatic composition must route around them.',
      'The currently attended thought should dominate without permanently obscuring relevant context.',
      'Materialization, dematerialization and semantic glow must preserve epistemic meaning and reduced-motion accessibility.',
      'Mobile should recompose cognition rather than shrink desktop coordinates.',
      'Every interactive surface must be keyboard reachable and have a non-pointer interaction path.',
      'Optimization must preserve the distinctive black/white/scarlet ibis visual identity unless evidence demonstrates a usability problem.'
    ],
    privacyRules:[
      'Session replay and heatmap capture require explicit product privacy policy and consent behavior appropriate to jurisdiction.',
      'Mask credentials, financial fields, health data, private messages and other sensitive inputs by default.',
      'Prefer aggregate behavior metrics unless raw replay is materially necessary for diagnosis.',
      'Never send private Headspace contents to third-party analytics merely for UX optimization.'
    ],
    routingExamples:[
      {request:'Why are users not finishing this signup?',operations:['FUNNEL_ANALYSIS','FORM_FRICTION','SESSION_REPLAY_ANALYSIS','ACCESSIBILITY_AUDIT']},
      {request:'Make this interface easier to use on phones.',operations:['MOBILE_USABILITY','RESPONSIVE_AUDIT','TOUCH_TARGET_AUDIT','COGNITIVE_LOAD']},
      {request:'Did this redesign actually improve the site?',operations:['VISUAL_REGRESSION','PERFORMANCE_AUDIT','EXPERIMENT_ANALYSIS','TASK_COMPLETION_TEST']},
      {request:'Why do these Headspace thoughts feel cluttered?',operations:['HEADSPACE_COLLISION_AUDIT','HEADSPACE_ATTENTION_AUDIT','VISUAL_HIERARCHY','SPACING_RHYTHM']},
      {request:'Check every button and interaction before release.',operations:['INTERACTION_AUDIT','CROSS_BROWSER_TEST','KEYBOARD_NAVIGATION','ERROR_STATE_AUDIT']}
    ],
    verifiedAt:VERIFIED_AT
  };
  function clone(x){return JSON.parse(JSON.stringify(x));}
  FTN.UxUiOptimizationLane={get:function(){return clone(lane);},capabilities:function(){return lane.capabilities.slice();},verifiedAt:VERIFIED_AT,integrationState:'DISCOVERY_ONLY'};
})(typeof window!=='undefined'?window:globalThis);
