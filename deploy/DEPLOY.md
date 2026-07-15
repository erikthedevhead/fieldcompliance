# FieldCompliance — Deployment Runbook

Target architecture:
- **Backend + Postgres**: DigitalOcean droplet, NestJS via PM2 behind nginx
- **Frontend**: Vercel (Next.js auto-detected from `frontend/` subdir)
- **Domain**: subdomain of a domain you already control

This matches the TimeClock pattern — if you can deploy that, you can deploy this. Estimated first-time deploy: 45–60 min.

---

## 0. Prerequisites

- [ ] DigitalOcean account with API access
- [ ] Namecheap (or wherever DNS lives) account
- [ ] Vercel account linked to your GitHub
- [ ] Domain decision: subdomain like `fc-api.houghworks.com` (fast) or a fresh domain like `fieldcompliance.io` (better long-term positioning)
- [ ] SSH key registered with DigitalOcean

For MVP, `fc-api.houghworks.com` is fine — you can swap later.

---

## 1. Provision the droplet

**Size**: Basic Regular / 2 GB RAM / 1 vCPU / 50 GB SSD ($12/mo). Fine for MVP through the first 10 paying customers. Upgrade when Postgres starts sweating.

**OS**: Ubuntu 24.04 LTS.

**Region**: NYC3 or SFO3 for lowest latency to US operators.

**Hostname**: `fc-prod-01`

Add your SSH key at create time.

Once it boots, note the IP. For the rest of this doc, replace `137.184.X.X` with your droplet IP.

---

## 2. Point DNS at the droplet

In Namecheap (or wherever the domain lives), add an A record:

```
Host:  fc-api        (or whatever subdomain)
Type:  A Record
Value: 137.184.X.X   (your droplet IP)
TTL:   Automatic
```

Wait 2–5 minutes for propagation. Verify:
```bash
dig +short fc-api.houghworks.com
# should return your droplet IP
```

---

## 3. One-time droplet setup

SSH in as root:
```bash
ssh root@137.184.X.X
```

Copy `setup-droplet.sh` from this deploy folder up to the droplet and run it. Fastest way is inline:

```bash
# On your local machine
scp deploy/setup-droplet.sh root@137.184.X.X:/root/
```

Then on the droplet:
```bash
chmod +x /root/setup-droplet.sh
./setup-droplet.sh
```

This installs Node 22, Postgres 16, PM2, nginx, certbot, and creates the `fc` deploy user with a `fieldcompliance` Postgres database. It also configures the firewall.

Read through the script before running it — it's short and does exactly what it says.

**When it finishes, note the auto-generated database password it prints.** You'll need it for `.env`.

---

## 4. First-time backend deploy

Still on the droplet:

```bash
# Switch to the deploy user
su - fc

# Clone the repo
git clone https://github.com/erikthedevhead/fieldcompliance.git
cd fieldcompliance
```

Create the production `.env`:
```bash
cp deploy/.env.production.example .env
nano .env
```

Fill in **at minimum**:
- `DATABASE_URL` — with the password from step 3
- `JWT_SECRET` — generate with `openssl rand -hex 64`
- `FRONTEND_URL` — leave as placeholder for now, we'll circle back

Save and exit.

Copy the PM2 ecosystem file into the repo root and mark scripts executable:
```bash
cp deploy/ecosystem.config.js .
chmod +x deploy/deploy.sh
```

First-time deploy — installs deps, generates Prisma client, pushes schema, builds, starts PM2:
```bash
./deploy/deploy.sh
```

Once the health check passes, seed the reference data (EPA regulations, factors, sample org):
```bash
node prisma/seed.js
```

Verify the process:
```bash
pm2 status
pm2 logs fc-api --lines 20
```

You should see the NestJS bootstrap logs ending with `🚀 FieldCompliance API running on http://localhost:3001/api/v1`.

Configure PM2 to auto-start on reboot — run this as root (exit back to root shell first):
```bash
exit  # back to root
pm2 startup systemd -u fc --hp /home/fc
# Copy-paste the command it prints and run it
sudo -u fc pm2 save
```

---

## 5. nginx + SSL

Still as root:

```bash
# Drop in the site config
cp /home/fc/fieldcompliance/deploy/nginx.conf /etc/nginx/sites-available/fc-api

# Edit to set your actual domain
nano /etc/nginx/sites-available/fc-api
# Replace `fc-api.example.com` with your actual subdomain

# Enable the site
ln -s /etc/nginx/sites-available/fc-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

Verify HTTP works:
```bash
curl http://fc-api.houghworks.com/api/v1/health
# Should return {"status":"ok",...}
```

Now get an SSL certificate:
```bash
certbot --nginx -d fc-api.houghworks.com
# Follow prompts. Accept defaults for redirect.
```

Verify HTTPS:
```bash
curl https://fc-api.houghworks.com/api/v1/health
```

---

## 6. Deploy frontend to Vercel

In your browser:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `fieldcompliance` repo
3. **Root directory**: `frontend` (this is the critical config)
4. Framework Preset: Next.js (auto-detected)
5. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://fc-api.houghworks.com/api/v1`
6. Deploy

Vercel will build and give you a URL like `fieldcompliance-abc123.vercel.app`. Note it.

---

## 7. Wire the CORS loop closed

Go back to the droplet:

```bash
su - fc
cd fieldcompliance
nano .env
```

Set `FRONTEND_URL` to your Vercel URL:
```
FRONTEND_URL=https://fieldcompliance-abc123.vercel.app
```

Restart:
```bash
pm2 restart fc-api
```

---

## 8. Smoke-test end-to-end

Open the Vercel URL in your browser. You should land on the login page. Log in with:
- `admin@lonestarep.example.com`
- `Localdev123!`

⚠️ **Change or delete this sample login before demoing to anyone external.** See "Post-deploy hardening" below.

If login works and the dashboard renders with the seeded facility, you're live.

---

## 9. Post-deploy hardening

Do these before showing anyone else:

- [ ] Register your real admin org via API:
  ```bash
  curl -X POST https://fc-api.houghworks.com/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"you@houghworks.com","password":"<strong>","firstName":"Erik","lastName":"Hough","orgName":"HoughWorks"}'
  ```
- [ ] Delete or update the sample admin password:
  ```bash
  psql $DATABASE_URL -c "UPDATE \"User\" SET \"passwordHash\" = 'DELETED' WHERE email = 'admin@lonestarep.example.com';"
  ```
  (Or delete the whole Lone Star E&P org — up to you.)
- [ ] Set up a custom Vercel domain if you own one
- [ ] Add a Cloudflare or DigitalOcean daily Postgres backup
- [ ] Configure PM2 log rotation: `pm2 install pm2-logrotate`

---

## Ongoing deploys

After the first-time setup, deploys are one command. From your local machine:
```bash
ssh fc@137.184.X.X 'cd fieldcompliance && ./deploy/deploy.sh'
```

Or SSH in and run `./deploy/deploy.sh` directly. See `deploy.sh` for what it does.

Frontend deploys automatically on `git push origin main` since Vercel is watching the repo.

---

## Troubleshooting

**"Application not responding"** after nginx setup → check `pm2 logs fc-api` for a boot error. Most often a `.env` issue.

**"Database connection failed"** → verify the DATABASE_URL user/password match what setup-droplet.sh generated. Check `sudo -u postgres psql -c "\du"`.

**CORS error in browser** → confirm `FRONTEND_URL` in the backend `.env` matches the Vercel URL exactly (including `https://`, no trailing slash). Restart PM2.

**Certbot renewal fails** → runs automatically twice daily via systemd timer. Verify with `systemctl status certbot.timer`.

**PM2 process keeps restarting** → almost always a `.env` issue or a Prisma client that wasn't generated. Run `npm run db:generate` then `pm2 restart fc-api`.
