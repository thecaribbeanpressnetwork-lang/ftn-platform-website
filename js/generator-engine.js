// FTN Platform Website — Generator Engine (Sprint 1, Wave 1).
//
// Precisely scoped per the founder's direction: validated input -> deterministic business logic
// -> generated output -> export handoff. Not an orchestration/workflow engine -- there is no
// multi-step coordination here, just one real, transparent, rule-based generation step. A true
// Workflow Engine is future scope if a product needs to orchestrate multiple steps/services
// later; this is honest about being smaller than that.
//
// A "generator" is a plain object: { validate(input) -> {valid, errors}, generate(input) -> output }.
// The engine just runs those two functions in order and returns a consistent result shape --
// it deliberately does not know anything about events, music, or any specific product.
(function (global) {
  'use strict';

  function run(generatorDef, input) {
    var validation = generatorDef.validate(input);
    if (!validation.valid) {
      return { valid: false, errors: validation.errors, output: null };
    }
    var output = generatorDef.generate(input);
    return { valid: true, errors: [], output: output };
  }

  global.FTN = global.FTN || {};
  global.FTN.GeneratorEngine = { run: run };
})(window);
