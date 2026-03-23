<template>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__brand">
        <div class="footer__logo">m</div>
        <div>
          <strong>mStay</strong>
          <p>Decentralized booking experience built on Ethereum.</p>
        </div>
      </div>

      <div class="footer__cols">
        <div class="footer__col">
          <h4>Explore</h4>
          <a href="/">Home</a>
          <a href="/listings">Listings</a>
          <a href="/my-trips">My Trips</a>
        </div>

        <div class="footer__col">
          <h4>Hosting</h4>
          <a href="/create-listing">Create Listing</a>
          <a href="/my-hosting">My Hosting</a>
        </div>

        <div class="footer__col">
          <h4>Platform</h4>
          <span>Escrow payments</span>
          <span>MetaMask login</span>
          <span>On-chain bookings</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: 48px;
  border-top: 1px solid var(--border);
  background: #ffffff;
}

.footer__inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 28px 24px 40px;
  display: flex;
  justify-content: space-between;
  gap: 28px;
}

.footer__brand {
  display: flex;
  gap: 14px;
  max-width: 360px;
}

.footer__logo {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
}

.footer__brand p {
  margin: 6px 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.footer__cols {
  display: flex;
  gap: 42px;
  flex-wrap: wrap;
}

.footer__col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer__col h4 {
  margin: 0 0 4px;
  font-size: 0.95rem;
}

.footer__col a,
.footer__col span {
  color: var(--muted);
  font-size: 0.94rem;
}

@media (max-width: 900px) {
  .footer__inner {
    flex-direction: column;
  }
}
</style>
