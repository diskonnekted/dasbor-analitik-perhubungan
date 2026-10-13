// Sample/fallback data laporan kerusakan jalan.
// Digunakan saat Supabase OFF. Field mengikuti schema /api/laporan dari
// https://github.com/diskonnekted/lapor-jalan

export const SAMPLE_LAPORAN = {
  items: [
    {
      id: 1, status: 'verified', tingkat: 'berat',
      jenis_id: 'dis_pothole', jenis_label: 'Lubang (Pothole)',
      kategori: 'Lubang & Pelepasan',
      nama_pelapor: 'Budi Santoso', no_hp: '081234567890',
      nama_jalan: 'JL. Nasional Km 3 Banjarnegara - Bawang',
      nomor_ruas: 'III.5', id_ruas: 583,
      kecamatan: 'Bawang', desa: 'Krandegan',
      latitude: -7.411, longitude: 109.795,
      deskripsi: 'Lubang besar diameter 80cm di tengah jalan, membahayakan pengguna jalan terutama malam hari.',
      foto: 'pothole1.jpg', verified_by: 'admin', verified_at: '2026-08-15T10:30:00',
      created_at: '2026-08-14T08:15:00',
      foto_perbaikan: null
    },
    {
      id: 2, status: 'pending', tingkat: 'sedang',
      jenis_id: 'crack_alligator', jenis_label: 'Retak Buaya (Jaring)',
      kategori: 'Retakan',
      nama_pelapor: 'Siti Aminah', no_hp: '081567890123',
      nama_jalan: 'JL. Raya Madukara - Pagentan',
      nomor_ruas: 'I.8', id_ruas: 588,
      kecamatan: 'Madukara', desa: 'Madukara',
      latitude: -7.355, longitude: 109.770,
      deskripsi: 'Retakan buaya di area persimpangan, panjang sekitar 5 meter.',
      foto: 'crack1.jpg', verified_by: null, verified_at: null,
      created_at: '2026-08-25T14:22:00',
      foto_perbaikan: null
    },
    {
      id: 3, status: 'in_progress', tingkat: 'ringan',
      jenis_id: 'def_rutting', jenis_label: 'Alur (Rutting)',
      kategori: 'Deformasi',
      nama_pelapor: 'Ahmad Fauzi', no_hp: '082345678901',
      nama_jalan: 'JL. Punggelan - Wanadadi',
      nomor_ruas: 'IV.12', id_ruas: 601,
      kecamatan: 'Punggelan', desa: 'Simerang',
      latitude: -7.395, longitude: 109.635,
      deskripsi: 'Alur bekas roda di kedua jalur, kedalaman sekitar 2 cm.',
      foto: 'rutting1.jpg', verified_by: 'admin', verified_at: '2026-08-10T09:00:00',
      created_at: '2026-08-08T16:45:00',
      foto_perbaikan: 'perbaikan_3.jpg'
    },
    {
      id: 4, status: 'verified', tingkat: 'berat',
      jenis_id: 'surf_ponding', jenis_label: 'Genangan Air',
      kategori: 'Permukaan & Drainase',
      nama_pelapor: 'Dewi Lestari', no_hp: '083456789012',
      nama_jalan: 'JL. Klampok - Susukan',
      nomor_ruas: 'V.20', id_ruas: 595,
      kecamatan: 'Susukan', desa: 'Klampok',
      latitude: -7.475, longitude: 109.620,
      deskripsi: 'Genangan air saat hujan, saluran drainase tersumbat sampah.',
      foto: 'ponding1.jpg', verified_by: 'admin', verified_at: '2026-08-20T11:15:00',
      created_at: '2026-08-19T07:30:00',
      foto_perbaikan: null
    },
    {
      id: 5, status: 'done', tingkat: 'berat',
      jenis_id: 'dis_pothole', jenis_label: 'Lubang (Pothole)',
      kategori: 'Lubang & Pelepasan',
      nama_pelapor: 'Eko Prasetyo', no_hp: '084567890123',
      nama_jalan: 'JL. Bawang - Pejawaran',
      nomor_ruas: 'I.42', id_ruas: 594,
      kecamatan: 'Bawang', desa: 'Bawang',
      latitude: -7.430, longitude: 109.610,
      deskripsi: 'Beberapa lubang besar dekat tikungan tajam.',
      foto: 'pothole2.jpg', verified_by: 'admin', verified_at: '2026-08-05T13:00:00',
      created_at: '2026-08-01T10:00:00',
      foto_perbaikan: 'perbaikan_5.jpg'
    },
    {
      id: 6, status: 'rejected', tingkat: 'ringan',
      jenis_id: 'crack_transverse', jenis_label: 'Retak Melintang',
      kategori: 'Retakan',
      nama_pelapor: 'Anonim', no_hp: null,
      nama_jalan: 'JL. Wisata Dieng',
      nomor_ruas: null, id_ruas: null,
      kecamatan: 'Batur', desa: 'Dieng Kulon',
      latitude: -7.230, longitude: 109.760,
      deskripsi: 'Retakan kecil melintang jalan, masih dalam batas wajar.',
      foto: null, verified_by: 'admin', verified_at: '2026-08-22T10:00:00',
      created_at: '2026-08-21T09:00:00',
      foto_perbaikan: null
    },
    {
      id: 7, status: 'verified', tingkat: 'sedang',
      jenis_id: 'def_settlement', jenis_label: 'Amblas / Penurunan',
      kategori: 'Deformasi',
      nama_pelapor: 'Joko Widodo', no_hp: '085678901234',
      nama_jalan: 'JL. Kalibening - Pandanarum',
      nomor_ruas: 'II.18', id_ruas: 600,
      kecamatan: 'Kalibening', desa: 'Kalibening',
      latitude: -7.460, longitude: 109.495,
      deskripsi: 'Jalan amblas sekitar 10 cm di atas gorong-gorong.',
      foto: 'settlement1.jpg', verified_by: 'admin', verified_at: '2026-08-18T08:00:00',
      created_at: '2026-08-17T14:00:00',
      foto_perbaikan: null
    },
    {
      id: 8, status: 'pending', tingkat: 'ringan',
      jenis_id: 'dis_raveling', jenis_label: 'Pengelupasan / Berkerikil',
      kategori: 'Lubang & Pelepasan',
      nama_pelapor: 'Sri Mulyani', no_hp: '086789012345',
      nama_jalan: 'JL. Sigaluh - Madukara',
      nomor_ruas: 'I.30', id_ruas: 590,
      kecamatan: 'Sigaluh', desa: 'Sigaluh',
      latitude: -7.450, longitude: 109.770,
      deskripsi: 'Permukaan jalan kasar, batu mulai lepas.',
      foto: 'raveling1.jpg', verified_by: null, verified_at: null,
      created_at: '2026-08-28T06:00:00',
      foto_perbaikan: null
    }
  ],
  stats: {
    total: 8,
    by_status: { pending: 2, verified: 3, in_progress: 1, done: 1, rejected: 1 },
    by_tingkat: { ringan: 3, sedang: 2, berat: 3 },
    by_kategori: { 'Retakan': 2, 'Lubang & Pelepasan': 3, 'Deformasi': 2, 'Permukaan & Drainase': 1 }
  },
  source: 'fallback-sample',
  generated_at: '2026-08-29',
  note: 'Data fallback karena Supabase/backend lapor-jalan tidak tersedia.'
};
