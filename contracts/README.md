# E-Voting Smart Contracts

Folder ini merangkum *development environment* (Hardhat) khusus untuk jaringan Ethereum / EVM-compatible yang berisikan cetak biru instruksi *Smart Contract* aplikasi E-Voting.

## Arsitektur `VotingSystem.sol`

Kontrak sentralistik utama (`VotingSystem.sol`) ditulis dengan standar `^0.8.28` Solidity, membawahi dua pilar utama logika identitas dan interaktivitas:

### 1. Sistem NFT `Soulbound` (Kartu Pemilih)
- Menginheritasi standarisasi `ERC721`.
- Memanfaatkan teknik *Override* fungsi transfer standar (`_update` di OpenZeppelin v5) demi memblokir pengiriman token antar satu pengguna ke pengguna lainnya (Non-transferable). Token yang diterbitkan ini *mutlak terikat permanen* merepresentasikan status keaktifan sebagai identitas siswa terdaftar di Universitas/Organisasi.

### 2. Fungsi Manajemen Pemilihan (Voting)
- Struktur data untuk mendefinisikan *Sessions* (`id`, nama, deskripsi, waktu mulai, waktu selesai, status aktif) dan *Candidates* (`id`, nama, jumlah suara). Foto, visi, dan misi kandidat saat ini disimpan off-chain melalui backend `/api/candidates/metadata`.
- Menyediakan *safeguard validator* yang memastikan hanya pemegang NFT (yang otomatis merupakan entitas tersertifikasi verifikasi awal *backend*) yang berhak memancarkan konfirmasi tanda tangan kriptografi `vote`.
- **(Pembaruan): Fitur *Voter Allowlist*** — Kemampuan membatasi hak istimewa *voting* dalam satu sesi persis, spesifik hanya untuk delegasi tertentu bedasarkan daftar akun tervalidasi per-sesi pemilihan tersebut.

## Panduan Lokal & Workflow

Semua pembaruan pada direktori `contracts/` memengaruhi struktur utama proyek keseluruhan.  

Abaikan *Warning: Gas Estimation* dan manfaatkan skrip komprehensif kami:

1.  **Jalankan Node RPC Virtual:**  
    ```bash
    npx hardhat node
    ```
    Skrip ini memastikan tiruan Mainnet Ethereum akan berjalan di *Background*, lengkap dengan 20 daftar akun donatur dummy ETH untuk keperluan *testing fee*.

2.  **Kompilasi dan sebarkan Jembatan (Deploy):**  
    Buka terminal yang terpisah (dengan Node RPC tetap dibiarkan menyala):
    ```bash
    npx hardhat run scripts/deploy_combined.js --network localhost
    ```
    Skrip ajaib `deploy_combined.js` ini mendistribusikan langsung ABI file `.json` dan *Smart Contract Address* menuju `.env` dari *backend* serta *frontend* tanpa mengharuskan input copy-paste presisi secara manual.

3.  (Opsional) **Test-Case Tertulis:**  
    Gunakan `npx hardhat test` untuk mensertifikasi integritas validasi unit, modifikasi, kelancaran eksekusi token *Soulbound* dan mitigasi kelemahan keamanan.
