# Gazetteer build report

- Source: `crop_production.csv` sha256 `5b2637058ca4aff2…`, `ind_adm2_points.csv` sha256 `a040e9cc95c843ff…`
- Districts in crop data: **652** (years ≤ 2014, area > 0)
- Coordinates found: **598** — match tiers: {'exact': 489, 'geocoded': 78, 'none': 54, 'fuzzy': 31}
- Supported (coordinates and ≥ 50 rows since 2008): **522**
- Aggregated regional statistic rows: 245529

## Non-exact matches to review

| State | Crop-data district | Matched boundary name | Tier | Score |
|---|---|---|---|---|
| ANDHRA PRADESH | VISAKHAPATANAM | VISHAKHAPATNAM | fuzzy | 0.929 |
| ASSAM | DHUBRI | DHUBURI | fuzzy | 0.923 |
| BIHAR | PURBI CHAMPARAN | PURBA CHAMPARAN | fuzzy | 0.933 |
| CHHATTISGARH | RAJNANDGAON | RAJ NANDGAON | fuzzy | 0.957 |
| HARYANA | YAMUNANAGAR | YAMUNA NAGAR | fuzzy | 0.957 |
| JHARKHAND | HAZARIBAGH | HAZARIBAG | fuzzy | 0.947 |
| JHARKHAND | SAHEBGANJ | SAHIBGANJ | fuzzy | 0.889 |
| KARNATAKA | CHAMARAJANAGAR | CHAMRAJNAGAR | fuzzy | 0.923 |
| KARNATAKA | DAVANGERE | DAVANAGERE | fuzzy | 0.947 |
| KARNATAKA | UTTAR KANNAD | UTTAR KANNAND | fuzzy | 0.96 |
| KERALA | PATHANAMTHITTA | PATTANAMTITTA | fuzzy | 0.889 |
| MAHARASHTRA | BULDHANA | BULDANA | fuzzy | 0.933 |
| MAHARASHTRA | GONDIA | GONDIYA | fuzzy | 0.923 |
| ODISHA | ANUGUL | ANGUL | fuzzy | 0.909 |
| ODISHA | BARGARH | BARAGARH | fuzzy | 0.933 |
| ODISHA | JAGATSINGHAPUR | JAGATSINGHPUR | fuzzy | 0.963 |
| ODISHA | JAJAPUR | JAJPUR | fuzzy | 0.923 |
| PUNJAB | FIROZEPUR | FIROZPUR | fuzzy | 0.941 |
| RAJASTHAN | JALORE | JALOR | fuzzy | 0.909 |
| RAJASTHAN | JHUNJHUNU | JHUNJHUNUN | fuzzy | 0.947 |
| TAMIL NADU | TIRUCHIRAPPALLI | TIRUCHCHIRAPPALLI | fuzzy | 0.938 |
| UTTAR PRADESH | BARABANKI | BARA BANKI | fuzzy | 0.947 |
| UTTAR PRADESH | KUSHI NAGAR | KUSHINAGAR | fuzzy | 0.952 |
| UTTAR PRADESH | SANT KABEER NAGAR | SANT KABIR NAGAR | fuzzy | 0.909 |
| UTTAR PRADESH | SANT RAVIDAS NAGAR | SANT RAVI DAS NAGAR | fuzzy | 0.973 |
| UTTARAKHAND | DEHRADUN | DEHRA DUN | fuzzy | 0.941 |
| UTTARAKHAND | NAINITAL | NAINI TAL | fuzzy | 0.941 |
| UTTARAKHAND | UDAM SINGH NAGAR | UDHAM SINGH NAGAR | fuzzy | 0.97 |
| UTTARAKHAND | UTTAR KASHI | UTTARKASHI | fuzzy | 0.952 |
| WEST BENGAL | BARDHAMAN | BARDDHAMAN | fuzzy | 0.947 |
| WEST BENGAL | PURULIA | PURULIYA | fuzzy | 0.933 |

## Unsupported districts

| State | District | Coordinates | Recent rows |
|---|---|---|---|
| Andaman And Nicobar Islands | Nicobars | no | 15 |
| Andaman And Nicobar Islands | North And Middle Andaman | no | 18 |
| Andaman And Nicobar Islands | South Andamans | no | 18 |
| Andhra Pradesh | Spsr Nellore | no | 289 |
| Arunachal Pradesh | Anjaw | no | 64 |
| Arunachal Pradesh | Dibang Valley | no | 50 |
| Arunachal Pradesh | Kurung Kumey | yes | 48 |
| Arunachal Pradesh | Longding | no | 13 |
| Arunachal Pradesh | Namsai | no | 1 |
| Assam | Baksa | no | 255 |
| Assam | Chirang | no | 253 |
| Assam | Dima Hasao | no | 241 |
| Assam | Kamrup Metro | no | 254 |
| Assam | Sivasagar | no | 240 |
| Bihar | Kaimur (Bhabua) | no | 120 |
| Chandigarh | Chandigarh | yes | 15 |
| Chhattisgarh | Gariyaband | no | 155 |
| Chhattisgarh | Kabirdham | no | 228 |
| Gujarat | Dang | no | 83 |
| Gujarat | Tapi | no | 118 |
| Haryana | Mewat | no | 79 |
| Himachal Pradesh | Bilaspur | yes | 38 |
| Himachal Pradesh | Chamba | yes | 47 |
| Himachal Pradesh | Hamirpur | yes | 38 |
| Himachal Pradesh | Kinnaur | yes | 22 |
| Himachal Pradesh | Kullu | yes | 46 |
| Himachal Pradesh | Lahul And Spiti | yes | 13 |
| Himachal Pradesh | Solan | yes | 38 |
| Himachal Pradesh | Una | yes | 38 |
| Jammu And Kashmir | Anantnag | yes | 18 |
| Jammu And Kashmir | Badgam | yes | 20 |
| Jammu And Kashmir | Bandipora | no | 11 |
| Jammu And Kashmir | Baramulla | no | 13 |
| Jammu And Kashmir | Doda | yes | 18 |
| Jammu And Kashmir | Ganderbal | yes | 7 |
| Jammu And Kashmir | Jammu | yes | 29 |
| Jammu And Kashmir | Kargil | yes | 9 |
| Jammu And Kashmir | Kathua | yes | 29 |
| Jammu And Kashmir | Kishtwar | yes | 16 |
| Jammu And Kashmir | Kulgam | yes | 12 |
| Jammu And Kashmir | Kupwara | yes | 3 |
| Jammu And Kashmir | Leh Ladakh | no | 16 |
| Jammu And Kashmir | Poonch | yes | 10 |
| Jammu And Kashmir | Pulwama | yes | 16 |
| Jammu And Kashmir | Rajauri | yes | 12 |
| Jammu And Kashmir | Ramban | yes | 8 |
| Jammu And Kashmir | Reasi | yes | 21 |
| Jammu And Kashmir | Samba | yes | 21 |
| Jammu And Kashmir | Shopian | no | 7 |
| Jammu And Kashmir | Srinagar | yes | 16 |
| Jammu And Kashmir | Udhampur | yes | 28 |
| Jharkhand | Bokaro | yes | 6 |
| Jharkhand | Chatra | yes | 6 |
| Jharkhand | Deoghar | yes | 6 |
| Jharkhand | Dhanbad | yes | 6 |
| Jharkhand | Dumka | yes | 6 |
| Jharkhand | East Singhbum | no | 6 |
| Jharkhand | Garhwa | yes | 7 |
| Jharkhand | Giridih | yes | 6 |
| Jharkhand | Godda | yes | 7 |
| Jharkhand | Gumla | yes | 6 |
| Jharkhand | Hazaribagh | yes | 6 |
| Jharkhand | Jamtara | yes | 6 |
| Jharkhand | Khunti | yes | 6 |
| Jharkhand | Koderma | yes | 6 |
| Jharkhand | Latehar | yes | 7 |
| Jharkhand | Lohardaga | yes | 6 |
| Jharkhand | Pakur | yes | 5 |
| Jharkhand | Palamu | yes | 7 |
| Jharkhand | Ramgarh | yes | 6 |
| Jharkhand | Ranchi | yes | 6 |
| Jharkhand | Sahebganj | yes | 6 |
| Jharkhand | Saraikela Kharsawan | yes | 6 |
| Jharkhand | Simdega | yes | 6 |
| Jharkhand | West Singhbhum | no | 6 |
| Karnataka | Bengaluru Urban | no | 292 |
| Karnataka | Chikballapur | no | 295 |
| Karnataka | Ramanagara | no | 275 |
| Madhya Pradesh | Agar Malwa | no | 28 |
| Maharashtra | Mumbai | yes | 0 |
| Maharashtra | Palghar | yes | 11 |
| Maharashtra | Raigad | no | 74 |
| Manipur | Bishnupur | yes | 0 |
| Manipur | Chandel | yes | 0 |
| Manipur | Churachandpur | yes | 0 |
| Manipur | Imphal East | no | 0 |
| Manipur | Imphal West | no | 0 |
| Manipur | Senapati | yes | 0 |
| Manipur | Tamenglong | yes | 0 |
| Manipur | Thoubal | yes | 0 |
| Manipur | Ukhrul | yes | 0 |
| Meghalaya | East Jaintia Hills | no | 132 |
| Meghalaya | North Garo Hills | no | 57 |
| Meghalaya | South West Garo Hills | no | 59 |
| Meghalaya | South West Khasi Hills | no | 35 |
| Meghalaya | West Jaintia Hills | no | 37 |
| Mizoram | Aizawl | yes | 22 |
| Mizoram | Champhai | yes | 20 |
| Mizoram | Kolasib | yes | 24 |
| Mizoram | Lawngtlai | yes | 20 |
| Mizoram | Lunglei | yes | 26 |
| Mizoram | Mamit | yes | 20 |
| Mizoram | Saiha | yes | 12 |
| Mizoram | Serchhip | yes | 14 |
| Puducherry | Mahe | yes | 27 |
| Puducherry | Pondicherry | no | 273 |
| Punjab | Faridkot | yes | 39 |
| Punjab | Fatehgarh Sahib | yes | 34 |
| Punjab | Fazilka | yes | 25 |
| Punjab | Kapurthala | yes | 37 |
| Punjab | Moga | yes | 48 |
| Punjab | Nawanshahr | yes | 41 |
| Punjab | Pathankot | yes | 26 |
| Punjab | S.A.S Nagar | no | 58 |
| Sikkim | North District | no | 63 |
| Sikkim | South District | no | 66 |
| Sikkim | West District | no | 65 |
| Tamil Nadu | The Nilgiris | no | 74 |
| Telangana | Hyderabad | yes | 0 |
| Tripura | Gomati | no | 61 |
| Tripura | Sepahijala | no | 57 |
| Tripura | Unakoti | no | 62 |
| Uttar Pradesh | Kanpur Nagar | no | 229 |
| West Bengal | 24 Paraganas North | no | 169 |
| West Bengal | 24 Paraganas South | no | 153 |
| West Bengal | Coochbehar | no | 224 |
| West Bengal | Dinajpur Dakshin | no | 114 |
| West Bengal | Dinajpur Uttar | no | 227 |
| West Bengal | Medinipur East | no | 120 |
| West Bengal | Medinipur West | no | 244 |
