import re
sql = open(r'I:\perhubungan\public\onlinkid_rambu.sql', encoding='utf-8').read()
for table in ['idpel_terpasang','pju','lmandiri','tagihan']:
    pat = re.compile(r"INSERT INTO `" + re.escape(table) + r"`\s*\(([^)]*)\)\s*VALUES\s*(.*?);", re.DOTALL | re.IGNORECASE)
    ms = list(pat.finditer(sql))
    print(table, 'blocks:', len(ms), 'first cols:', ms[0].group(1)[:80] if ms else 'NONE')