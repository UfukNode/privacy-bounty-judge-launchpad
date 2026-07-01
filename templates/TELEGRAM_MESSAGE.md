# Telegram Share Message

Kanka Ritual Academy ödevi için tek tık açılabilen yardımcı bir rehber hazırladım.

Bu resmi Ritual kaynağı değil ve ödevin hazır cevabı değil. Sadece commit-reveal mantığını anlamak, commitment hesaplamak ve teslim checklist'ini takip etmek için.

Repo:

```text
https://github.com/UfukNode/privacy-bounty-judge-launchpad
```

Canlı sayfa:

```text
https://ufuknode.github.io/privacy-bounty-judge-launchpad/
```

Codespaces ile aç:

```text
https://codespaces.new/UfukNode/privacy-bounty-judge-launchpad?quickstart=1
```

Ne işe yarıyor?

- Cevap + salt + wallet + bountyId girince commitment hesaplıyor.
- Commit-reveal akışını basit anlatıyor.
- Test checklist veriyor.
- README ve architecture note template veriyor.
- Discord Proof of Building formunda ne yazılacağını gösteriyor.

Güvenlik:

- Private key istemez.
- Wallet bağlatmaz.
- İmza istemez.
- Backend yok.
- Database yok.
- Her şey lokal tarayıcıda çalışır.

Özet akış:

```text
Deadline'dan önce: submitCommitment
Deadline'dan sonra: revealAnswer
Sonra owner: judgeAll
En son: finalizeWinner
```

Asıl çalışmanız gereken resmi workshop repo:

```text
https://github.com/cozfuttu/ritual-chain-workshop
```
