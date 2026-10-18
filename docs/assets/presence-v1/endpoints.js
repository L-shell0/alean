/* Explicit deployment contract from K/Lilith. Unknown hosts fail closed. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.PresenceEndpoints=api;})(globalThis,()=>{
  const bases=Object.freeze({
    'serviciosdeoca.com':'https://sar1a.serviciosdeoca.com',
    'www.serviciosdeoca.com':'https://sar1a.serviciosdeoca.com',
    'aria.serviciosdeoca.com':'https://sar1a.serviciosdeoca.com',
    '13ghosts.io':'https://sar1a.13ghosts.io',
    'www.13ghosts.io':'https://sar1a.13ghosts.io',
    'storiesbyjez.com':'https://sar1a.storiesbyjez.com',
    'www.storiesbyjez.com':'https://sar1a.storiesbyjez.com',
    'lempyra.com':'https://sar1a.lempyra.com',
    'www.lempyra.com':'https://sar1a.lempyra.com',
    'alean.lempyra.com':'https://sar1a.lempyra.com',
    'jezabel.net':'https://sar1a.jezabel.net',
    'www.jezabel.net':'https://sar1a.jezabel.net',
    'jezabel.xyz':'https://sar1a.jezabel.xyz',
    'www.jezabel.xyz':'https://sar1a.jezabel.xyz',
    'blendstory.xyz':'https://sar1a.blendstory.xyz',
    'www.blendstory.xyz':'https://sar1a.blendstory.xyz',
    'maniacgaming.online':'https://sar1a.maniacgaming.online',
    'www.maniacgaming.online':'https://sar1a.maniacgaming.online',
    'mividacomoluna.com':'https://sar1a.mividacomoluna.com',
    'www.mividacomoluna.com':'https://sar1a.mividacomoluna.com'
  });
  function resolve(hostname){const base=bases[String(hostname).toLowerCase()];
    if(!base)throw new Error('No API is configured for this hostname. Access remains closed.');return base;
  }
  return Object.freeze({bases,resolve});
});
