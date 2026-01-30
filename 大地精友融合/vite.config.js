import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        icon: 'https://www.easyepc123.com/static/favicon.ico',
        namespace: 'ccicclaim',
        match: ['https://claim.ccic-net.com.cn/claim/synergismOpenClaimController*',
          'https://claim.ccic-net.com.cn:25075/claim/synergismOpenClaimController*',
          'https://claim.ccic-net.com.cn*/claim/synergismOpenClaimController*',
          'https://claim.ccic-net.com.cn*/claim/bpmTaskController.do*',
          'https://claim.ccic-net.com.cn:25075/claim/casLoginController.do*'
        ],
        noframes: true,
        version: '0.3.3',
        name: '大地融合精友定损',
        "run-at": "document-end",
        grant: [
          'GM_setValue',
          'GM_getValue',
          'GM_xmlhttpRequest',
          'GM_notification',
        ],
        connect: [
          '10.1.174.79',
          'ccic-claim.jingyougroup.com',
          'claim.ccic-net.com.cn'
        ],
        // require: [
        //   'https://scriptcat.org/lib/513/2.1.0/ElementGetter.js#sha256=aQF7JFfhQ7Hi+weLrBlOsY24Z2ORjaxgZNoni7pAz5U=',
        // ],
        unsafeWindow: true,

      },
    }),
  ],
  build: {
    minify: false,
    outDir: 'dist',
    sourcemap: false,

  }
});
