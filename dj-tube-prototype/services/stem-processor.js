/* Stem processor provider interface. Actual separation must run through a licensed/authorized
 * model/service; this client never extracts audio from YouTube iframes.
 */
export class StemProcessor {
  constructor(provider=null){this.provider=provider;}
  async separate(source,{stems=['vocals','drums','bass','other']}={}){
    if(!this.provider?.separate)throw new Error('No authorized stem provider configured');
    return this.provider.separate(source,{stems});
  }
  async duck(source,stem,amount=.5){if(!this.provider?.duck)throw new Error('Stem provider has no duck operation');return this.provider.duck(source,stem,amount);}
}
export class LocalStemProviderAdapter {constructor(worker){this.worker=worker;}async separate(source,opts){return this.worker.separate(source,opts);}}
