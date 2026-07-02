# Telegram Share Message

Ritual Academy ödevi için tek arayüzden kullanılabilen unofficial bir tool hazırladım.

Bu resmi Ritual kaynağı değil. Ödevi sizin yerinize yazmıyor ama tarayıcıdan yapılacak işleri tek ekrana topluyor.

Repo:

```text
https://github.com/UfukNode/privacy-bounty-judge-launchpad
```

Ne yapıyor?

- Wallet bağlanıyor.
- Ritual Chain'e geçiyor / ağı ekliyor.
- Default commit-reveal `AIJudge.sol` kodunu otomatik yüklüyor ve arayüzden compile ediyor.
- Hardhat artifact JSON veya 0x bytecode ile contract deploy ediyor.
- Deploy contract address ve tx hash'i kaydediyor.
- `createBounty` tx gönderiyor.
- Salt üretiyor.
- Commitment hesaplıyor.
- `submitCommitment` tx gönderiyor.
- `revealAnswer` tx gönderiyor.
- `judgeAll` tx gönderiyor.
- `finalizeWinner` tx gönderiyor.
- Discord Proof of Building alanlarını tek pakette kopyalatıyor.

Güvenlik:

- Private key istemez.
- Seed phrase istemez.
- Backend yok.
- Database yok.
- Token approval yok.
- Her işlem wallet confirmation ekranından geçer.

Local çalıştırma:

```bash
git clone https://github.com/UfukNode/privacy-bounty-judge-launchpad.git
cd privacy-bounty-judge-launchpad
npm install
npm start
```

Sonra:

```text
http://localhost:5173
```

Codespaces:

```text
https://codespaces.new/UfukNode/privacy-bounty-judge-launchpad?quickstart=1
```

Asıl resmi workshop repo:

```text
https://github.com/cozfuttu/ritual-chain-workshop
```

Not: Tool compile/deploy/tx tarafını tek arayüze alır. Yine de `AIJudge.sol` kodunu doğru yazmanız gerekir. `judgeAll` için geçerli `llmInput` bytes değerini workshop encoder'dan veya kendi encoder'ınızdan almanız gerekiyor.
