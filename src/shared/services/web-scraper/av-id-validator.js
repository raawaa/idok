/**
 * AV番号验证器
 * 支持多种AV番号格式的验证和标准化
 */

class AvIdValidator {
  constructor() {
    // 定义各种番号格式规则
    this.patterns = {
      // 主流厂商格式
      s1: /^([A-Z]{2,4})-(\d{2,4})$/i,                    // IPX-177, ABP-888
      prestige: /^([A-Z]{2,4})-(\d{2,4})$/i,               // 同上，用于区分
      ideaPocket: /^([A-Z]{2,4})-(\d{2,4})$/i,            // IPX系列
      moodyz: /^([A-Z]{2,4})-(\d{2,4})$/i,                 // MIRD, MIAE系列
      
      // 特殊格式
      fc2: /^FC2[-_\s]?PPV[-_\s]?(\d{6,10})$/i,           // FC2-PPV-1234567
      heyzo: /^HEYZO[-_\s]?(\d{4})$/i,                    // HEYZO-1234
      caribbeancom: /^(\d{6}[-_]\d{2})$/i,                // 012023-001
      caribbeancompr: /^(\d{6}[-_]\d{3})$/i,             // 012023-001
      tokyoHot: /^n[-_\s]?(\d{4})$/i,                     // n0001
      
      // 其他格式
      generic: /^([A-Z]{1,4})[-_\s]?(\d{1,5})$/i,         // 通用格式 A-1, ABC-123
      alphanumeric: /^([A-Z0-9]{2,6})[-_\s]?(\d{2,6})$/i   // 字母数字混合
    };

    // 厂商映射表
    this.studioMap = {
      'IPX': 'IdeaPocket',
      'IPIT': 'IdeaPocket',
      'IPTD': 'IdeaPocket',
      'IDBD': 'IdeaPocket',
      'ABP': 'Prestige',
      'SSNI': 'S1',
      'SSIS': 'S1',
      'MIAE': 'Moodyz',
      'MIRD': 'Moodyz',
      'DVAJ': 'Alice Japan',
      'ATID': 'Attackers',
      'SHKD': 'Attackers',
      'RBD': 'Attackers',
      'ADN': 'Attackers',
      'JUL': 'Madonna',
      'JUY': 'Madonna',
      'JUX': 'Madonna',
      'NTR': 'Madonna',
      'HND': 'Hon Naka',
      'HNDS': 'Hon Naka',
      'PRED': 'Premium',
      'PJD': 'Premium',
      'VEC': 'Venus',
      'VENU': 'Venus',
      'JUC': 'Venus',
      'WANZ': 'Wanz Factory',
      'WZD': 'Wanz Factory',
      'CJOD': 'Crazy Japan',
      'CJVR': 'Crazy Japan',
      'DASD': 'Dasdas',
      'DFDA': 'Fitch',
      'DFDC': 'Fitch',
      'DFDM': 'Fitch',
      'EKW': 'Kawaii',
      'EKDV': 'Kawaii',
      'GAREA': 'Garea',
      'HBAD': 'Hibino',
      'HMPD': 'Hmp',
      'HNDX': 'Hon Naka',
      'HZGD': 'Hajime Kikaku',
      'IEN': 'Ienergy',
      'IENV': 'Ienergy',
      'JBD': 'Jade',
      'JBJ': 'Jade',
      'JJDA': 'Jade',
      'KAWD': 'Kawaii',
      'KBKD': 'Kobayashi',
      'KIRE': 'Kirei',
      'LADY': 'Ladyx',
      'LAKA': 'Lamulta',
      'LUXU': 'Luxury',
      'MBM': 'Maboroshi',
      'MBYD': 'Maboroshi',
      'MDYD': 'Madonna',
      'MDTM': 'Mdt',
      'MEYD': 'Meyd',
      'MGT': 'Mugon',
      'MIAA': 'Moodyz',
      'MIDE': 'Moodyz',
      'MIUM': 'Mium',
      'MKMP': 'Makip',
      'MMKZ': 'Miman',
      'MMNA': 'Miman',
      'MNF': 'Manforce',
      'MRSS': 'Marss',
      'MSD': 'Msd',
      'MUDR': 'Mudr',
      'MXGS': 'Maxing',
      'MXS': 'Maxing',
      'NACR': 'Nacr',
      'NACS': 'Nacs',
      'NAMA': 'Namanaka',
      'NATR': 'Natur',
      'NBES': 'Nubest',
      'NDRA': 'Nadeshiko',
      'NGOD': 'Nagae',
      'NHDTA': 'Hunter',
      'NKKD': 'Nikkatsu',
      'NNPJ': 'Nampa',
      'NOAH': 'Noah',
      'NPS': 'Nps',
      'NSPS': 'Nagae',
      'NTK': 'Nikutai',
      'NTTR': 'Nettaiya',
      'NUDE': 'Nuude',
      'NUMK': 'Numk',
      'NVM': 'Nv',
      'NYHD': 'Nyoshin',
      'OBUT': 'Obutsu',
      'OFJE': 'Onefeat',
      'OKSN': 'Okusan',
      'OMHD': 'Omhd',
      'OPBD': 'Open',
      'OPUD': 'Opud',
      'OREB': 'Ore',
      'OREC': 'Ore',
      'OREP': 'Ore',
      'ORETD': 'Ore',
      'OREX': 'Ore',
      'OVG': 'Ovg',
      'OVGE': 'Ovg',
      'OVGHD': 'Ovg',
      'PACO': 'Paco',
      'PAPA': 'Papakura',
      'PARM': 'Parm',
      'PART': 'Part',
      'PBAD': 'Pbd',
      'PBES': 'Pbes',
      'PCOL': 'Pcolle',
      'PDV': 'Pdv',
      'PGD': 'Pgd',
      'PGFD': 'Pg',
      'PHD': 'Phd',
      'PJD': 'Pjd',
      'PKJD': 'Pk',
      'PKPD': 'Pk',
      'PMX': 'Pmx',
      'PNC': 'Pnc',
      'PND': 'Pnd',
      'PNES': 'Pnes',
      'PNT': 'Pnt',
      'PPM': 'Ppm',
      'PPPD': 'Pppd',
      'PRD': 'Prd',
      'PRED': 'Pred',
      'PRTD': 'Prtd',
      'PSD': 'Psd',
      'PTHL': 'Pthl',
      'PTRD': 'Ptrd',
      'PUS': 'Pus',
      'PUTA': 'Puta',
      'PWP': 'Pwp',
      'PXD': 'Pxd',
      'PYLD': 'Py',
      'QBD': 'Qbd',
      'QQ': 'Qq',
      'R18': 'R18',
      'RBD': 'Rbd',
      'RCT': 'Rct',
      'RCTD': 'Rctd',
      'REAL': 'Real',
      'REBD': 'Rebd',
      'RED': 'Red',
      'RELA': 'Rela',
      'RKI': 'Rki',
      'RKIY': 'Rki',
      'RKJ': 'Rkj',
      'RMPD': 'Rmp',
      'ROE': 'Roe',
      'ROSD': 'Rosd',
      'ROSS': 'Ross',
      'RPD': 'Rpd',
      'RTP': 'Rtp',
      'RUMI': 'Rumi',
      'RVG': 'Rvg',
      'S2M': 'S2',
      'SABA': 'Saba',
      'SACE': 'Sace',
      'SAM': 'Sam',
      'SAMU': 'Samu',
      'SANO': 'Sano',
      'SARA': 'Sara',
      'SAS': 'Sas',
      'SASJ': 'Sasj',
      'SBAD': 'Sbad',
      'SBCI': 'Sbci',
      'SCA': 'Sca',
      'SCAP': 'Scap',
      'SCD': 'Scd',
      'SCOP': 'Scop',
      'SCR': 'Scr',
      'SCUTE': 'Scute',
      'SDAB': 'Sdab',
      'SDDE': 'Sdde',
      'SDJS': 'Sdjs',
      'SDMF': 'Sdmf',
      'SDMU': 'Sdmu',
      'SDNM': 'Sdnm',
      'SDNT': 'Sdnt',
      'SEBE': 'Sebe',
      'SEDU': 'Sedu',
      'SEI': 'Sei',
      'SEKA': 'Seka',
      'SERO': 'Sero',
      'SEV': 'Sev',
      'SFBA': 'Sfba',
      'SGA': 'Sga',
      'SHB': 'Shb',
      'SHD': 'Shd',
      'SHIC': 'Shic',
      'SHKD': 'Shkd',
      'SHL': 'Shl',
      'SHN': 'Shn',
      'SHP': 'Shp',
      'SIS': 'Sis',
      'SIV': 'Siv',
      'SJ': 'Sj',
      'SJBD': 'Sjbd',
      'SJET': 'Sjet',
      'SJK': 'Sjk',
      'SJML': 'Sjml',
      'SKD': 'Skd',
      'SKMJ': 'Skmj',
      'SKSK': 'Sksk',
      'SKY': 'Sky',
      'SKYJ': 'Skyj',
      'SLD': 'Sld',
      'SLV': 'Slv',
      'SMA': 'Sma',
      'SMC': 'Smc',
      'SMDB': 'Smdb',
      'SMIT': 'Smit',
      'SMM': 'Smm',
      'SMN': 'Smn',
      'SMOM': 'Smom',
      'SMR': 'Smr',
      'SMS': 'Sms',
      'SMT': 'Smt',
      'SMU': 'Smu',
      'SNIS': 'Snis',
      'SOAV': 'Soav',
      'SOE': 'Soe',
      'SOG': 'Sog',
      'SOJ': 'Soj',
      'SONE': 'Sone',
      'SORA': 'Sora',
      'SPBD': 'Spbd',
      'SPCE': 'Spce',
      'SPDR': 'Spdr',
      'SPN': 'Spn',
      'SPRD': 'Sprd',
      'SPZ': 'Spz',
      'SQB': 'Sqb',
      'SQTE': 'Sqte',
      'SRD': 'Srd',
      'SRHO': 'Srho',
      'SRZD': 'Srzd',
      'SS': 'Ss',
      'SSAN': 'Ssan',
      'SSBR': 'Ssbr',
      'SSCI': 'Ssci',
      'SSKP': 'Sskp',
      'SSLD': 'Ssld',
      'SSM': 'Ssm',
      'SSND': 'Ssnd',
      'SSNI': 'Ssni',
      'SSPD': 'Sspd',
      'SSR': 'Ssr',
      'SSS': 'Sss',
      'ST': 'St',
      'STAR': 'Star',
      'STD': 'Std',
      'STE': 'Ste',
      'STF': 'Stf',
      'STKO': 'Stko',
      'STND': 'Stnd',
      'STOL': 'Stol',
      'STP': 'Stp',
      'STR': 'Str',
      'STRA': 'Stra',
      'STU': 'Stu',
      'SUPD': 'Supd',
      'SUPA': 'Supa',
      'SUPD': 'Supd',
      'SUR': 'Sur',
      'SVD': 'Svd',
      'SW': 'Sw',
      'SWE': 'Swe',
      'SWF': 'Swf',
      'SXC': 'Sxc',
      'SYD': 'Syd',
      'SYK': 'Syk',
      'T28': 'T28',
      'TAA': 'Taa',
      'TACH': 'Tach',
      'TACHI': 'Tachi',
      'TAKA': 'Taka',
      'TAM': 'Tam',
      'TAN': 'Tan',
      'TAP': 'Tap',
      'TAR': 'Tar',
      'TBA': 'Tba',
      'TCD': 'Tcd',
      'TCM': 'Tcm',
      'TDB': 'Tdb',
      'TDD': 'Tdd',
      'TDK': 'Tdk',
      'TDM': 'Tdm',
      'TDR': 'Tdr',
      'TEM': 'Tem',
      'TEN': 'Ten',
      'TFT': 'Tft',
      'TGAV': 'Tgav',
      'TGC': 'Tgc',
      'TGL': 'Tgl',
      'TH': 'Th',
      'THD': 'Thd',
      'THN': 'Thn',
      'THP': 'Thp',
      'THZ': 'Thz',
      'TIA': 'Tia',
      'TIB': 'Tib',
      'TIN': 'Tin',
      'TIO': 'Tio',
      'TKI': 'Tki',
      'TKN': 'Tkn',
      'TLA': 'Tla',
      'TLAD': 'Tlad',
      'TLC': 'Tlc',
      'TLD': 'Tld',
      'TLER': 'Tler',
      'TLG': 'Tlg',
      'TLN': 'Tln',
      'TLS': 'Tls',
      'TMA': 'Tma',
      'TMC': 'Tmc',
      'TMEM': 'Tmem',
      'TMG': 'Tmg',
      'TMHK': 'Tmhk',
      'TMNF': 'Tmnf',
      'TMNR': 'Tmnr',
      'TMSB': 'Tmsb',
      'TMT': 'Tmt',
      'TNAT': 'Tnat',
      'TND': 'Tnd',
      'TNG': 'Tng',
      'TNH': 'Tnh',
      'TNSS': 'Tnss',
      'TOEN': 'Toen',
      'TOKI': 'Toki',
      'TOKU': 'Toku',
      'TOMN': 'Tomn',
      'TON': 'Ton',
      'TORA': 'Tora',
      'TPD': 'Tpd',
      'TPPN': 'Tppn',
      'TRD': 'Trd',
      'TRG': 'Trg',
      'TRP': 'Trp',
      'TRUM': 'Trum',
      'TRY': 'Try',
      'TS': 'Ts',
      'TSA': 'Tsa',
      'TSF': 'Tsf',
      'TSJ': 'Tsj',
      'TSK': 'Tsk',
      'TSM': 'Tsm',
      'TSP': 'Tsp',
      'TSSD': 'Tssd',
      'TST': 'Tst',
      'TURA': 'Tura',
      'TVG': 'Tvg',
      'TWB': 'Twb',
      'TWO': 'Two',
      'TYOD': 'Tyod',
      'TYUM': 'Tyum',
      'TZX': 'Tzx',
      'UAA': 'Uaa',
      'UAAU': 'Uaau',
      'UBA': 'Uba',
      'UCHI': 'Uchi',
      'UD': 'Ud',
      'UDAK': 'Udak',
      'UEH': 'Ueh',
      'UFD': 'Ufd',
      'UGO': 'Ugo',
      'UHDM': 'Uhdm',
      'UKA': 'Uka',
      'UKB': 'Ukb',
      'UKD': 'Ukd',
      'UKN': 'Ukn',
      'UKR': 'Ukr',
      'UKY': 'Uky',
      'ULP': 'Ulp',
      'UMD': 'Umd',
      'UMN': 'Umn',
      'UMSO': 'Umso',
      'UNC': 'Unc',
      'UNDX': 'Undx',
      'UNKO': 'Unko',
      'UNR': 'Unr',
      'UPA': 'Upa',
      'UPC': 'Upc',
      'UPD': 'Upd',
      'UPO': 'Upo',
      'URA': 'Ura',
      'URF': 'Urf',
      'URKK': 'Urkk',
      'US': 'Us',
      'USD': 'Usd',
      'USJR': 'Usjr',
      'USP': 'Usp',
      'USRN': 'Usrn',
      'UST': 'Ust',
      'USW': 'Usw',
      'UTA': 'Uta',
      'UTD': 'Utd',
      'UTF': 'Utf',
      'UTH': 'Uth',
      'UTK': 'Utk',
      'UTS': 'Uts',
      'UU': 'Uu',
      'UUR': 'Uur',
      'VAGU': 'Vagu',
      'VAND': 'Vand',
      'VANG': 'Vang',
      'VARM': 'Varm',
      'VENU': 'Venu',
      'VERO': 'Vero',
      'VGD': 'Vgd',
      'VGD': 'Vgd',
      'VHS': 'Vhs',
      'VICD': 'Vicd',
      'VIDD': 'Vidd',
      'VIN': 'Vin',
      'VNDS': 'Vnds',
      'VOV': 'Vov',
      'VRKM': 'Vrkm',
      'VRTM': 'Vrtm',
      'VRXS': 'Vrxs',
      'VS': 'Vs',
      'VSP': 'Vsp',
      'VSPDS': 'Vspds',
      'VSPM': 'Vspm',
      'WAAA': 'Waaa',
      'WACH': 'Wach',
      'WAKA': 'Waka',
      'WANZ': 'Wanz',
      'WAS': 'Was',
      'WAVR': 'Wavr',
      'WAVR': 'Wavr',
      'WBDS': 'Wbds',
      'WCR': 'Wcr',
      'WDI': 'Wdi',
      'WDR': 'Wdr',
      'WED': 'Wed',
      'WET': 'Wet',
      'WF': 'Wf',
      'WFHD': 'Wfhd',
      'WH': 'Wh',
      'WHIM': 'Whim',
      'WHX': 'Whx',
      'WIC': 'Wic',
      'WIFE': 'Wife',
      'WILD': 'Wild',
      'WILL': 'Will',
      'WIN': 'Win',
      'WIST': 'Wist',
      'WKD': 'Wkd',
      'WKD': 'Wkd',
      'WLD': 'Wld',
      'WLF': 'Wlf',
      'WMV': 'Wmv',
      'WNZ': 'Wnz',
      'WO': 'Wo',
      'WOMN': 'Womn',
      'WORK': 'Work',
      'WSP': 'Wsp',
      'WSR': 'Wsr',
      'WTK': 'Wtk',
      'WTKL': 'Wtkl',
      'WTKZ': 'Wtkz',
      'WTR': 'Wtr',
      'WUF': 'Wuf',
      'WVL': 'Wvl',
      'WVR': 'Wvr',
      'WW': 'Ww',
      'WWD': 'Wwd',
      'WWW': 'Www',
      'WYF': 'Wyf',
      'XAD': 'Xad',
      'XAI': 'Xai',
      'XAM': 'Xam',
      'XAM': 'Xam',
      'XAN': 'Xan',
      'XAV': 'Xav',
      'XAX': 'Xax',
      'XCH': 'Xch',
      'XDK': 'Xdk',
      'XEX': 'Xex',
      'XF': 'Xf',
      'XFAM': 'Xfam',
      'XHAM': 'Xham',
      'XHL': 'Xhl',
      'XID': 'Xid',
      'XIN': 'Xin',
      'XKM': 'Xkm',
      'XKX': 'Xkx',
      'XL': 'Xl',
      'XLD': 'Xld',
      'XLX': 'Xlx',
      'XMN': 'Xmn',
      'XNC': 'Xnc',
      'XND': 'Xnd',
      'XNG': 'Xng',
      'XNX': 'Xnx',
      'XOD': 'Xod',
      'XRL': 'Xrl',
      'XRW': 'Xrw',
      'XSX': 'Xsx',
      'XT': 'Xt',
      'XTC': 'Xtc',
      'XTG': 'Xtg',
      'XTM': 'Xtm',
      'XTR': 'Xtr',
      'XTT': 'Xtt',
      'XXX': 'Xxx',
      'XYD': 'Xyd',
      'XYL': 'Xyl',
      'YAL': 'Yal',
      'YAN': 'Yan',
      'YAO': 'Yao',
      'YAY': 'Yay',
      'YCH': 'Ych',
      'YDF': 'Ydf',
      'YEA': 'Yea',
      'YMDD': 'Ymdd',
      'YML': 'Yml',
      'YMR': 'Ymr',
      'YMS': 'Yms',
      'YMT': 'Ymt',
      'YND': 'Ynd',
      'YNS': 'Yns',
      'YOB': 'Yob',
      'YOR': 'Yor',
      'YRMN': 'Yrmn',
      'YSN': 'Ysn',
      'YSN': 'Ysn',
      'YST': 'Yst',
      'YTR': 'Ytr',
      'YUI': 'Yui',
      'YUME': 'Yume',
      'YUNA': 'Yuna',
      'YURU': 'Yuru',
      'ZEX': 'Zex',
      'ZEXR': 'Zexr',
      'ZIKO': 'Ziko',
      'ZIZ': 'Ziz',
      'ZIZG': 'Zizg',
      'ZMAR': 'Zmar',
      'ZMAR': 'Zmar',
      'ZOCM': 'Zocm',
      'ZON': 'Zon',
      'ZON': 'Zon',
      'ZUKO': 'Zuko',
      'ZUKO': 'Zuko',
      'ZUPP': 'Zupp',
      'ZW': 'Zw'
    };
  }

  /**
   * 验证番号格式
   * @param {string} avId - 番号字符串
   * @returns {boolean} - 是否有效
   */
  validate(avId) {
    if (!avId || typeof avId !== 'string') {
      return false;
    }

    const normalizedId = avId.trim().toUpperCase();
    
    // 检查所有模式
    for (const [key, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(normalizedId)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 标准化番号格式
   * @param {string} avId - 番号字符串
   * @returns {string|null} - 标准化后的番号，无效返回null
   */
  normalize(avId) {
    if (!this.validate(avId)) {
      return null;
    }

    const normalizedId = avId.trim().toUpperCase();
    
    // FC2特殊处理
    const fc2Match = normalizedId.match(this.patterns.fc2);
    if (fc2Match) {
      return `FC2-PPV-${fc2Match[1]}`;
    }
    
    // HEYZO特殊处理
    const heyzoMatch = normalizedId.match(this.patterns.heyzo);
    if (heyzoMatch) {
      return `HEYZO-${heyzoMatch[1]}`;
    }
    
    // 通用格式处理
    const genericMatch = normalizedId.match(this.patterns.generic);
    if (genericMatch) {
      return `${genericMatch[1]}-${genericMatch[2]}`;
    }
    
    return normalizedId;
  }

  /**
   * 提取番号信息
   * @param {string} avId - 番号字符串
   * @returns {object|null} - 番号信息对象
   */
  extractInfo(avId) {
    if (!this.validate(avId)) {
      return null;
    }

    const normalizedId = this.normalize(avId);
    if (!normalizedId) {
      return null;
    }

    const info = {
      raw: avId,
      normalized: normalizedId,
      studio: null,
      series: null,
      number: null,
      format: 'unknown'
    };

    // 提取厂商信息
    const prefix = normalizedId.split('-')[0];
    if (prefix && this.studioMap[prefix]) {
      info.studio = this.studioMap[prefix];
    } else if (prefix === 'HEYZO') {
      info.studio = 'Heyzo';
    } else if (prefix === 'FC2') {
      info.studio = 'FC2';
    }

    // 特殊格式识别
    if (normalizedId.startsWith('FC2-PPV-')) {
      info.format = 'fc2';
      info.series = 'FC2-PPV';
      info.number = normalizedId.replace('FC2-PPV-', '');
    } else if (normalizedId.startsWith('HEYZO-')) {
      info.format = 'heyzo';
      info.series = 'HEYZO';
      info.number = normalizedId.replace('HEYZO-', '');
    } else if (normalizedId.match(this.patterns.s1)) {
      info.format = 's1';
      const parts = normalizedId.split('-');
      info.series = parts[0];
      info.number = parts[1];
    } else if (normalizedId.match(this.patterns.generic)) {
      info.format = 'generic';
      const parts = normalizedId.split('-');
      if (parts.length === 2) {
        info.series = parts[0];
        info.number = parts[1];
      }
    }

    return info;
  }

  /**
   * 获取厂商名称
   * @param {string} avId - 番号字符串
   * @returns {string|null} - 厂商名称
   */
  getStudio(avId) {
    const normalizedId = this.normalize(avId);
    if (!normalizedId) {
      return null;
    }

    const prefix = normalizedId.split('-')[0];
    const upperPrefix = prefix.toUpperCase();
    
    if (upperPrefix === 'SSNI' || upperPrefix === 'SSIS') {
      return 'S1';
    } else if (upperPrefix === 'HEYZO') {
      return 'Heyzo';
    } else if (upperPrefix === 'FC2') {
      return 'FC2';
    } else if (this.studioMap[upperPrefix]) {
      return this.studioMap[upperPrefix];
    }
    
    return null;
  }

  /**
   * 判断是否为FC2格式
   * @param {string} avId - 番号字符串
   * @returns {boolean}
   */
  isFC2(avId) {
    return this.patterns.fc2.test(avId);
  }

  /**
   * 判断是否为HEYZO格式
   * @param {string} avId - 番号字符串
   * @returns {boolean}
   */
  isHeyzo(avId) {
    return this.patterns.heyzo.test(avId);
  }

  /**
   * 判断是否为S1格式
   * @param {string} avId - 番号字符串
   * @returns {boolean}
   */
  isS1(avId) {
    const normalizedId = avId.trim().toUpperCase();
    const prefix = normalizedId.split('-')[0];
    return ['SSNI', 'SSIS', 'SSPD', 'SSPD', 'S2M'].includes(prefix);
  }

  /**
   * 判断是否为IdeaPocket格式
   * @param {string} avId - 番号字符串
   * @returns {boolean}
   */
  isIdeaPocket(avId) {
    const normalizedId = avId.trim().toUpperCase();
    const prefix = normalizedId.split('-')[0];
    return ['IPX', 'IPIT', 'IPTD', 'IDBD'].includes(prefix);
  }

  /**
   * 获取所有支持的格式
   * @returns {Array} - 支持的格式列表
   */
  getSupportedFormats() {
    return Object.keys(this.patterns);
  }

  /**
   * 模糊匹配番号
   * @param {string} input - 输入字符串
   * @returns {Array} - 匹配到的番号列表
   */
  fuzzyMatch(input) {
    if (!input || typeof input !== 'string') {
      return [];
    }

    const results = [];
    const text = input.toUpperCase();
    
    // 使用更通用的番号匹配模式
    const genericPattern = /[A-Z]{2,4}[-_\s]?\d{2,6}/gi;
    const matches = text.match(genericPattern);
    
    if (matches) {
      matches.forEach(match => {
        const normalized = this.normalize(match);
        if (normalized && !results.includes(normalized)) {
          results.push(normalized);
        }
      });
    }

    // 特殊处理FC2格式
    const fc2Pattern = /FC2[-_\s]?PPV[-_\s]?\d{6,10}/gi;
    const fc2Matches = text.match(fc2Pattern);
    if (fc2Matches) {
      fc2Matches.forEach(match => {
        const normalized = this.normalize(match);
        if (normalized && !results.includes(normalized)) {
          results.push(normalized);
        }
      });
    }

    // 特殊处理HEYZO格式
    const heyzoPattern = /HEYZO[-_\s]?\d{4}/gi;
    const heyzoMatches = text.match(heyzoPattern);
    if (heyzoMatches) {
      heyzoMatches.forEach(match => {
        const normalized = this.normalize(match);
        if (normalized && !results.includes(normalized)) {
          results.push(normalized);
        }
      });
    }

    return results;
  }

  /**
   * 生成搜索关键词
   * @param {string} avId - 番号字符串
   * @returns {Array} - 搜索关键词列表
   */
  generateSearchKeywords(avId) {
    if (!this.validate(avId)) {
      return [];
    }

    const info = this.extractInfo(avId);
    if (!info) {
      return [];
    }

    const keywords = [info.normalized];

    // 添加变体
    if (info.series && info.number) {
      // 添加无分隔符版本
      keywords.push(`${info.series}${info.number}`);
      
      // 添加下划线版本
      keywords.push(`${info.series}_${info.number}`);
      
      // 添加空格版本
      keywords.push(`${info.series} ${info.number}`);
      
      // 对于FC2格式，添加特殊变体
      if (info.format === 'fc2') {
        keywords.push(`FC2PPV${info.number}`);
        keywords.push(`fc2-ppv-${info.number}`);
        keywords.push(`fc2_ppv_${info.number}`);
      }
    }

    // 添加原始输入（如果不同）
    if (info.raw !== info.normalized) {
      keywords.unshift(info.raw);
    }

    return [...new Set(keywords)]; // 去重
  }

  /**
   * 比较两个番号是否相同
   * @param {string} avId1 - 第一个番号
   * @param {string} avId2 - 第二个番号
   * @returns {boolean} - 是否相同
   */
  isSame(avId1, avId2) {
    const normalized1 = this.normalize(avId1);
    const normalized2 = this.normalize(avId2);
    
    return normalized1 === normalized2 && normalized1 !== null;
  }
}

module.exports = AvIdValidator;