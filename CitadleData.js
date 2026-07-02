const CITY_DATA = [
  // ==========================================
  // AFRICA
  // ==========================================

  // Algeria
  ["Algiers", 36.7538, 3.0588, "DZ"],

  // Angola
  ["Luanda", -8.8390, 13.2894, "AO"],

  // Botswana
  ["Gaborone", -24.6282, 25.9231, "BW"],

  // Burkina Faso
  ["Ouagadougou", 12.3714, -1.5197, "BF"],

  // Cameroon
  ["Douala", 4.0511, 9.7679, "CM"],
  ["Yaounde", 3.8480, 11.5021, "CM"],

  // Chad
  ["N'Djamena", 12.1348, 15.0557, "TD"],

  // Republic of the Congo
  ["Brazzaville", -4.2634, 15.2429, "CG"],

  // Democratic Republic of the Congo
  ["Kinshasa", -4.4419, 15.2663, "CD"],

  // Ivory Coast
  ["Abidjan", 5.3600, -4.0083, "CI"],

  // Djibouti
  ["Djibouti City", 11.5721, 43.1456, "DJ"],

  // Egypt
  ["Alexandria", 31.2001, 29.9187, "EG"],
  ["Cairo", 30.0444, 31.2357, "EG"],

  // Ethiopia
  ["Addis Ababa", 9.0300, 38.7400, "ET"],

  // Ghana
  ["Accra", 5.6037, -0.1870, "GH"],

  // Guinea
  ["Conakry", 9.6412, -13.5784, "GN"],

  // Kenya
  ["Mombasa", -4.0435, 39.6682, "KE"],
  ["Nairobi", -1.2921, 36.8219, "KE"],

  // Liberia
  ["Monrovia", 6.3156, -10.8074, "LR"],

  // Libya
  ["Tripoli", 32.8872, 13.1913, "LY"],

  // Madagascar
  ["Antananarivo", -18.8792, 47.5079, "MG"],

  // Mali
  ["Bamako", 12.6392, -8.0029, "ML"],

  // Mauritania / Morocco
  ["Casablanca", 33.5731, -7.5898, "MA"],
  ["Marrakech", 31.6295, -7.9811, "MA"],
  ["Rabat", 34.0209, -6.8417, "MA"],

  // Mauritius
  ["Port Louis", -20.1609, 57.5012, "MU"],

  // Mozambique
  ["Maputo", -25.9692, 32.5732, "MZ"],

  // Namibia
  ["Windhoek", -22.5609, 17.0658, "NA"],

  // Niger
  ["Niamey", 13.5128, 2.1128, "NE"],

  // Nigeria
  ["Abuja", 9.0765, 7.3986, "NG"],
  ["Lagos", 6.5244, 3.3792, "NG"],

  // Rwanda
  ["Kigali", -1.9403, 30.0586, "RW"],

  // Senegal
  ["Dakar", 14.7167, -17.4677, "SN"],

  // Sierra Leone
  ["Freetown", 8.4657, -13.2317, "SL"],

  // Somalia
  ["Mogadishu", 2.0469, 45.3182, "SO"],

  // South Africa
  ["Cape Town", -33.9249, 18.4241, "ZA"],
  ["Durban", -29.8587, 31.0218, "ZA"],
  ["Johannesburg", -26.2041, 28.0473, "ZA"],
  ["Pretoria", -25.7479, 28.2293, "ZA"],

  // Sudan
  ["Khartoum", 15.5007, 32.5599, "SD"],

  // Tanzania
  ["Dar es Salaam", -6.7924, 39.2083, "TZ"],

  // Tunisia
  ["Tunis", 36.8065, 10.1815, "TN"],

  // Uganda
  ["Kampala", 0.3476, 32.5825, "UG"],

  // Zambia
  ["Lusaka", -15.3875, 28.3228, "ZM"],

  // Zimbabwe
  ["Harare", -17.8252, 31.0335, "ZW"],


  // ==========================================
  // ASIA
  // ==========================================

  // United Arab Emirates
  ["Abu Dhabi", 24.4539, 54.3773, "AE"],
  ["Dubai", 25.2048, 55.2708, "AE"],

  // Afghanistan
  ["Kabul", 34.5553, 69.2075, "AF"],

  // Armenia
  ["Yerevan", 40.1792, 44.4991, "AM"],

  // Azerbaijan
  ["Baku", 40.4093, 49.8671, "AZ"],

  // Bangladesh
  ["Dhaka", 23.8103, 90.4125, "BD"],

  // Bahrain
  ["Manama", 26.2285, 50.5860, "BH"],

  // Brunei
  ["Bandar Seri Begawan", 4.9031, 114.9398, "BN"],

  // Bhutan
  ["Thimphu", 27.4728, 89.6390, "BT"],

  // China
  ["Beijing", 39.9042, 116.4074, "CN"],
  ["Chengdu", 30.5728, 104.0668, "CN"],
  ["Chongqing", 29.4393, 106.8877, "CN"],
  ["Guangzhou", 23.1291, 113.2644, "CN"],
  ["Shanghai", 31.2304, 121.4737, "CN"],
  ["Shenzhen", 22.5431, 114.0579, "CN"],
  ["Xi'an", 34.3416, 108.9398, "CN"],

  // Georgia
  ["Tbilisi", 41.7151, 44.8271, "GE"],

  // Hong Kong
  ["Hong Kong", 22.3193, 114.1694, "HK"],

  // Indonesia
  ["Bali", -8.4095, 115.1889, "ID"],
  ["Jakarta", -6.2088, 106.8456, "ID"],
  ["Surabaya", -7.2575, 112.7521, "ID"],

  // Israel
  ["Jerusalem", 31.7683, 35.2137, "IL"],
  ["Tel Aviv", 32.0853, 34.7818, "IL"],

  // India
  ["Bangalore", 12.9716, 77.5946, "IN"],
  ["Chennai", 13.0827, 80.2707, "IN"],
  ["Delhi", 28.7041, 77.1025, "IN"],
  ["Goa", 15.2993, 74.1240, "IN"],
  ["Hyderabad", 17.3850, 78.4867, "IN"],
  ["Jaipur", 26.9124, 75.7873, "IN"],
  ["Kolkata", 22.5726, 88.3639, "IN"],
  ["Mumbai", 19.0760, 72.8777, "IN"],

  // Iraq
  ["Baghdad", 33.3152, 44.3661, "IQ"],

  // Iran
  ["Tehran", 35.6892, 51.3890, "IR"],

  // Jordan
  ["Amman", 31.9454, 35.9284, "JO"],

  // Japan
  ["Kyoto", 35.0116, 135.7681, "JP"],
  ["Osaka", 34.6937, 135.5023, "JP"],
  ["Sapporo", 43.0618, 141.3545, "JP"],
  ["Tokyo", 35.6762, 139.6503, "JP"],

  // Kyrgyzstan
  ["Bishkek", 42.8746, 74.5698, "KG"],

  // Cambodia
  ["Phnom Penh", 11.5564, 104.9282, "KH"],

  // North Korea
  ["Pyongyang", 39.0392, 125.7625, "KP"],

  // South Korea
  ["Busan", 35.1796, 129.0756, "KR"],
  ["Seoul", 37.5665, 126.9780, "KR"],

  // Kuwait
  ["Kuwait City", 29.3759, 47.9774, "KW"],

  // Kazakhstan
  ["Almaty", 43.2220, 76.8512, "KZ"],
  ["Astana", 51.1605, 71.4704, "KZ"],

  // Laos
  ["Vientiane", 17.9757, 102.6331, "LA"],

  // Lebanon
  ["Beirut", 33.8938, 35.5018, "LB"],

  // Sri Lanka
  ["Colombo", 6.9271, 79.8612, "LK"],

  // Macao
  ["Macao", 22.1987, 113.5439, "MO"],

  // Maldives
  ["Male", 4.1755, 73.5093, "MV"],

  // Malaysia
  ["Kuala Lumpur", 3.1390, 101.6869, "MY"],

  // Myanmar
  ["Naypyidaw", 19.7633, 96.0785, "MM"],
  ["Yangon", 16.8409, 96.1735, "MM"],

  // Mongolia
  ["Ulaanbaatar", 47.8864, 106.9057, "MN"],

  // Nepal
  ["Kathmandu", 27.7172, 85.3240, "NP"],

  // Oman
  ["Muscat", 23.5880, 58.3829, "OM"],

  // Philippines
  ["Cebu City", 10.3157, 123.8854, "PH"],
  ["Manila", 14.5995, 120.9842, "PH"],

  // Pakistan
  ["Islamabad", 33.6844, 73.0479, "PK"],
  ["Karachi", 24.8607, 67.0011, "PK"],
  ["Lahore", 31.5497, 74.3436, "PK"],

  // Qatar
  ["Doha", 25.2854, 51.5310, "QA"],

  // Russia (Siberia / Asian Region)
  ["Irkutsk", 52.2978, 104.2964, "RU"],
  ["Krasnoyarsk", 56.0153, 92.8932, "RU"],
  ["Novosibirsk", 55.0084, 82.9357, "RU"],
  ["Vladivostok", 43.1198, 131.8869, "RU"],
  ["Yakutsk", 62.0397, 129.7422, "RU"],

  // Saudi Arabia
  ["Jeddah", 21.4858, 39.1925, "SA"],
  ["Mecca", 21.3891, 39.8579, "SA"],
  ["Riyadh", 24.7136, 46.6753, "SA"],

  // Singapore
  ["Singapore", 1.3521, 103.8198, "SG"],

  // Syria
  ["Damascus", 33.5138, 36.2765, "SY"],

  // Thailand
  ["Bangkok", 13.7563, 100.5018, "TH"],
  ["Chiang Mai", 18.7883, 98.9853, "TH"],

  // Tajikistan
  ["Dushanbe", 38.5598, 68.7870, "TJ"],

  // East Timor
  ["Dili", -8.5569, 125.5603, "TL"],

  // Turkmenistan
  ["Ashgabat", 37.9601, 58.3261, "TM"],

  // Turkey
  ["Ankara", 39.9334, 32.8597, "TR"],
  ["Antalya", 36.8848, 30.7040, "TR"],
  ["Istanbul", 41.0082, 28.9784, "TR"],

  // Taiwan
  ["Taipei", 25.0330, 121.5654, "TW"],

  // Uzbekistan
  ["Tashkent", 41.2995, 69.2401, "UZ"],

  // Vietnam
  ["Hanoi", 21.0285, 105.8542, "VN"],
  ["Ho Chi Minh City", 10.8231, 106.6297, "VN"],

  // Yemen
  ["Sanaa", 15.3694, 44.1910, "YE"],


  // ==========================================
  // EUROPE
  // ==========================================

  // Andorra
  ["Andorra la Vella", 42.5063, 1.5218, "AD"],

  // Albania
  ["Tirana", 41.3275, 19.8187, "AL"],

  // Bosnia and Herzegovina
  ["Sarajevo", 43.8563, 18.4131, "BA"],

  // Austria
  ["Graz", 47.0707, 15.4395, "AT"],
  ["Vienna", 48.2082, 16.3738, "AT"],

  // Belgium
  ["Antwerp", 51.2602, 4.4028, "BE"],
  ["Brussels", 50.8503, 4.3517, "BE"],

  // Bulgaria
  ["Sofia", 42.6977, 23.3219, "BG"],

  // Belarus
  ["Minsk", 53.9006, 27.5590, "BY"],

  // Switzerland
  ["Bern", 46.9481, 7.4475, "CH"],
  ["Geneva", 46.2044, 6.1432, "CH"],
  ["Zurich", 47.3769, 8.5417, "CH"],

  // Czech Republic
  ["Prague", 50.0755, 14.4378, "CZ"],

  // Germany
  ["Berlin", 52.5200, 13.4050, "DE"],
  ["Frankfurt", 50.1109, 8.6821, "DE"],
  ["Hamburg", 53.5511, 9.9937, "DE"],
  ["Munich", 48.1351, 11.5820, "DE"],

  // Denmark
  ["Copenhagen", 55.6761, 12.5683, "DK"],

  // Estonia
  ["Tallinn", 59.4370, 24.7536, "EE"],

  // Spain
  ["Barcelona", 41.3851, 2.1734, "ES"],
  ["Bilbao", 43.2630, -2.9350, "ES"],
  ["Madrid", 40.4168, -3.7038, "ES"],
  ["Seville", 37.3891, -5.9845, "ES"],
  ["Valencia", 39.4699, -0.3763, "ES"],

  // Finland
  ["Helsinki", 60.1699, 24.9384, "FI"],
  ["Rovaniemi", 66.5031, 25.7270, "FI"],

  // France
  ["Bordeaux", 44.8362, -0.5808, "FR"],
  ["Marseille", 43.2965, 5.3698, "FR"],
  ["Paris", 48.8566, 2.3522, "FR"],

  // United Kingdom
  ["Bath", 51.3811, -2.3590, "GB"],
  ["Belfast", 54.6079, -5.9264, "GB"],
  ["Edinburgh", 55.9533, -3.1883, "GB"],
  ["Glasgow", 55.8642, -4.2518, "GB"],
  ["London", 51.5074, -0.1278, "GB"],
  ["Manchester", 53.4808, -2.2426, "GB"],

  // Greece
  ["Athens", 37.9838, 23.7275, "GR"],
  ["Thessaloniki", 40.6401, 22.9444, "GR"],

  // Croatia
  ["Dubrovnik", 42.6403, 18.1083, "HR"],
  ["Split", 43.5082, 16.4402, "HR"],
  ["Zagreb", 45.8150, 15.9819, "HR"],

  // Hungary
  ["Budapest", 47.4979, 19.0402, "HU"],

  // Ireland
  ["Cork", 51.8972, -8.4700, "IE"],
  ["Dublin", 53.3498, -6.2603, "IE"],

  // Iceland
  ["Reykjavik", 64.1466, -21.9426, "IS"],

  // Italy
  ["Milan", 45.4642, 9.1900, "IT"],
  ["Naples", 40.8518, 14.2681, "IT"],
  ["Rome", 41.9028, 12.4964, "IT"],
  ["Venice", 45.4408, 12.3155, "IT"],

  // Lithuania
  ["Kaunas", 54.89722, 23.88611, "LT"],
  ["Vilnius", 54.6872, 25.2797, "LT"],

  // Luxembourg
  ["Luxembourg City", 49.6116, 6.1319, "LU"],

  // Latvia
  ["Riga", 56.9496, 24.1052, "LV"],

  // Moldova
  ["Chisinau", 47.0105, 28.8638, "MD"],

  // North Macedonia
  ["Skopje", 41.9981, 21.4254, "MK"],

  // Malta
  ["Valletta", 35.8989, 14.5146, "MT"],

  // Netherlands
  ["Amsterdam", 52.3676, 4.9041, "NL"],
  ["Rotterdam", 51.9244, 4.4777, "NL"],
  ["The Hague", 52.0787, 4.2888, "NL"],

  // Norway
  ["Bergen", 60.3913, 5.3221, "NO"],
  ["Oslo", 59.9139, 10.7522, "NO"],
  ["Tromso", 69.6758, 18.9663, "NO"],

  // Poland
  ["Gdansk", 54.3721, 18.6383, "PL"],
  ["Krakow", 50.0647, 19.9450, "PL"],
  ["Warsaw", 52.2297, 21.0122, "PL"],

  // Portugal
  ["Lisbon", 38.7223, -9.1393, "PT"],
  ["Porto", 41.1579, -8.6291, "PT"],

  // Romania
  ["Bucharest", 44.4268, 26.1025, "RO"],

  // Serbia
  ["Belgrade", 44.7866, 20.4489, "RS"],

  // Russia (European Region)
  ["Kaliningrad", 54.7076, 20.5035, "RU"],
  ["Kazan", 55.8304, 49.0661, "RU"],
  ["Moscow", 55.7558, 37.6173, "RU"],
  ["St Petersburg", 59.9311, 30.3609, "RU"],
  ["Yekaterinburg", 56.8389, 60.6057, "RU"],

  // Sweden
  ["Gothenburg", 57.7089, 11.9746, "SE"],
  ["Stockholm", 59.3293, 18.0686, "SE"],

  // Slovenia
  ["Ljubljana", 46.0569, 14.5058, "SI"],

  // Slovakia
  ["Bratislava", 48.1486, 17.1077, "SK"],

  // Ukraine
  ["Kyiv", 50.4501, 30.5234, "UA"],
  ["Odesa", 46.4857, 30.7434, "UA"],


  // ==========================================
  // NORTH AMERICA
  // ==========================================

  // Belize
  ["Belmopan", 17.2510, -88.7590, "BZ"],

  // Canada
  ["Calgary", 51.0447, -114.0719, "CA"],
  ["Montreal", 45.5019, -73.5674, "CA"],
  ["Ottawa", 45.4215, -75.6972, "CA"],
  ["Toronto", 43.6511, -79.3470, "CA"],
  ["Vancouver", 49.2827, -123.1207, "CA"],
  ["Winnipeg", 49.8951, -97.1384, "CA"],

  // Costa Rica
  ["San Jose Costa Rica", 9.9281, -84.0907, "CR"],

  // Cuba
  ["Havana", 23.1136, -82.3666, "CU"],

  // Dominican Republic
  ["Santo Domingo", 18.4861, -69.9312, "DO"],

  // Guatemala
  ["Guatemala City", 14.6349, -90.5069, "GT"],

  // Honduras
  ["Tegucigalpa", 14.0723, -87.1921, "HN"],

  // Jamaica
  ["Kingston", 17.9714, -76.7931, "JM"],

  // Mexico
  ["Cancun", 21.1619, -86.8515, "MX"],
  ["Guadalajara", 20.6597, -103.3496, "MX"],
  ["Mexico City", 19.4326, -99.1332, "MX"],
  ["Tijuana", 32.5149, -117.0382, "MX"],

  // Nicaragua
  ["Managua", 12.1364, -86.2514, "NI"],

  // Panama
  ["Panama City", 8.9824, -79.5199, "PA"],

  // Puerto Rico
  ["San Juan", 18.4655, -66.1057, "PR"],

  // El Salvador
  ["San Salvador", 13.6929, -89.2182, "SV"],

  // United States
  ["Anchorage", 61.2181, -149.9003, "US"],
  ["Atlanta", 33.7490, -84.3880, "US"],
  ["Austin", 30.2672, -97.7431, "US"],
  ["Boston", 42.3601, -71.0589, "US"],
  ["Chicago", 41.8781, -87.6298, "US"],
  ["Dallas", 32.7767, -96.7970, "US"],
  ["Denver", 39.7392, -104.9903, "US"],
  ["Detroit", 42.3314, -83.0458, "US"],
  ["Honolulu", 21.3069, -157.8583, "US"],
  ["Houston", 29.7604, -95.3698, "US"],
  ["Las Vegas", 36.1699, -115.1398, "US"],
  ["Los Angeles", 34.0522, -118.2437, "US"],
  ["Miami", 25.7617, -80.1918, "US"],
  ["Minneapolis", 44.9778, -93.2650, "US"],
  ["Nashville", 36.1627, -86.7816, "US"],
  ["New Orleans", 29.9511, -90.0715, "US"],
  ["New York", 40.7128, -74.0060, "US"],
  ["Philadelphia", 39.9526, -75.1652, "US"],
  ["Phoenix", 33.4484, -112.0740, "US"],
  ["Portland", 45.5152, -122.6784, "US"],
  ["Salt Lake City", 40.7608, -111.8910, "US"],
  ["San Antonio", 29.4241, -98.4936, "US"],
  ["San Diego", 32.7157, -117.1611, "US"],
  ["San Francisco", 37.7749, -122.4194, "US"],
  ["San Jose", 37.3382, -121.8863, "US"],
  ["Seattle", 47.6062, -122.3321, "US"],
  ["Washington DC", 38.9072, -77.0369, "US"],


  // ==========================================
  // OCEANIA
  // ==========================================

  // Australia
  ["Adelaide", -34.9285, 138.6007, "AU"],
  ["Brisbane", -27.4698, 153.0251, "AU"],
  ["Canberra", -35.2809, 149.1300, "AU"],
  ["Darwin", -12.4634, 130.8456, "AU"],
  ["Melbourne", -37.8136, 144.9631, "AU"],
  ["Perth", -31.9505, 115.8605, "AU"],
  ["Sydney", -33.8688, 151.2093, "AU"],

  // Fiji
  ["Suva", -18.1416, 178.4419, "FJ"],

  // New Caledonia
  ["Noumea", -22.2758, 166.4581, "NC"],

  // New Zealand
  ["Auckland", -36.8485, 174.7633, "NZ"],
  ["Christchurch", -43.5321, 172.6362, "NZ"],
  ["Wellington", -41.2865, 174.7762, "NZ"],

  // Papua New Guinea
  ["Port Moresby", -9.4438, 147.1803, "PG"],

  // Solomon Islands
  ["Honiara", -9.4280, 159.9498, "SB"],

  // Samoa
  ["Apia", -13.8506, -171.7513, "WS"],


  // ==========================================
  // SOUTH AMERICA
  // ==========================================

  // Argentina
  ["Buenos Aires", -34.6037, -58.3816, "AR"],
  ["Cordoba", -31.4201, -64.1888, "AR"],

  // Bolivia
  ["La Paz", -16.5000, -68.1500, "BO"],

  // Brazil
  ["Brasilia", -15.8267, -47.9218, "BR"],
  ["Manaus", -3.1190, -60.0217, "BR"],
  ["Recife", -8.0476, -34.8770, "BR"],
  ["Rio de Janeiro", -22.9068, -43.1729, "BR"],
  ["Salvador", -12.9777, -38.5016, "BR"],
  ["Sao Paulo", -23.5505, -46.6333, "BR"],

  // Chile
  ["Santiago", -33.4489, -70.6693, "CL"],

  // Colombia
  ["Bogota", 4.7110, -74.0721, "CO"],
  ["Medellin", 6.2476, -75.5658, "CO"],

  // Ecuador
  ["Quito", -0.1807, -78.4678, "EC"],

  // Guyana
  ["Georgetown", 6.8013, -58.1551, "GY"],

  // Peru
  ["Lima", -12.0464, -77.0428, "PE"],

  // Paraguay
  ["Asuncion", -25.2637, -57.5759, "PY"],

  // Suriname
  ["Paramaribo", 5.8520, -55.2038, "SR"],

  // Uruguay
  ["Montevideo", -34.9011, -56.1645, "UY"],

  // Venezuela
  ["Caracas", 10.4806, -66.9036, "VE"]
];
