"use client";

import Script from "next/script";
let NEXT_PUBLIC_GOOGLE_ADSENSE_ID="3410962713385660"

const GoogleAdsense = () => {
  return (
    <>
      {NEXT_PUBLIC_GOOGLE_ADSENSE_ID ? (
        <>
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${NEXT_PUBLIC_GOOGLE_ADSENSE_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        </>
      ) : (
        <></>
      )}
    </>
  );
};

export default GoogleAdsense;
