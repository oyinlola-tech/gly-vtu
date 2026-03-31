# Deployment Checklist & Runbook

**Last Updated**: March 31, 2026  
**Environment Targets**: Staging → Production  
**RTO**: 4 hours | **RPO**: 1 hour data loss max

---

## Pre-Deployment (48 Hours Before Go-Live)

### Database Preparation
- [ ] **Backup**: Full database backup created and verified
  - Command: `mysqldump -u root -p --all-databases > gly_vtu_backup_$(date +%Y%m%d).sql`
  - Verify: `mysql -u root -p < gly_vtu_backup.sql` (test restore in isolated DB)
- [ ] **Schema**: All migrations applied to staging
  - Verify: Compare staging schema hash to production baseline
- [ ] **Data**: Sensitive data encrypted (email, phone, BVN, NIN)
  - Verify: Run `SELECT COUNT(*) FROM users WHERE email NOT LIKE CONCAT(char(160), '%')` (should be 0 if encrypted)
- [ ] **Indexes**: All performance indexes created
  - Verify: `SHOW INDEXES FROM transactions;` returns expected indexes
- [ ] **Cleanup**: Old logs/events pruned (retention policies applied)
  - Verify: `DELETE FROM security_events WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);`

### Environment Variables & Secrets
- [ ] **Production env file** created (`.env.production`)
  - [ ] `JWT_SECRET` - Strong 32-byte random value (NOT dev_secret_change_me)
  - [ ] `JWT_ADMIN_SECRET` - Different from user JWT_SECRET
  - [ ] `PII_ENCRYPTION_KEY` - Strong 32-byte random value
  - [ ] `COOKIE_ENC_SECRET` - Strong 32-byte random value
  - [ ] `FLUTTERWAVE_SECRET_KEY` - From Flutterwave production account
  - [ ] `VTPASS_API_KEY` and `VTPASS_API_SECRET` - From Vtpass production account
  - [ ] `DB_HOST`, `DB_USER`, `DB_PASSWORD` - Production database credentials
  - [ ] `EMAIL_SERVICE_KEY` - Production email service key (SendGrid, Mailgun, etc.)
  - [ ] `REDIS_URL` - Production Redis connection string (if using Redis for rate limiting)
  - [ ] `NODE_ENV` - "production"
  - [ ] `TRUST_PROXY` - 1 (if behind reverse proxy like NGINX)
  - [ ] `CORS_ORIGIN` - Production frontend domain(s) only
  - [ ] `COOKIE_DOMAIN` - Production domain
  - [ ] `LOG_LEVEL` - "info" (not "debug" in production)
- [ ] **Secrets validation**: Run `node backend/utils/secretValidator.js`
  - Should display: "✅ All required secrets are set and valid"
  - Should NOT display any warnings about default values
- [ ] **No hardcoded secrets** in codebase
  - Grep check: `grep -r "secret\|password\|api.key" backend/ | grep -v node_modules | grep -v ".git"`
  - Expected: 0 results (all secrets should be from env vars)

### Code Quality & Security
- [ ] **Linting passed**: `npm run lint`
  - Expected: 0 errors, 0 warnings (or only known suppressions)
- [ ] **TypeScript compiled**: `npm run type-check`
  - Expected: 0 errors
- [ ] **Unit tests pass**: `npm run test:backend`
  - Coverage: >= 80%
- [ ] **Integration tests pass**: `npm run test:integration`
  - All payment flows passing
- [ ] **Security tests pass**: `npm run test:security`
  - No SQL injection, XSS, CSRF vulnerabilities
- [ ] **Build succeeds**: `npm run build`
  - Frontend build succeeds without errors
  - Backend compiled correctly
- [ ] **Security audit performed**: `npm audit`
  - [ ] No critical vulnerabilities
  - [ ] High vulnerabilities reviewed and accepted (if necessary)
  - Document any accepted/exempted vulnerabilities

### Monitoring & Logging Setup
- [ ] **Logging service configured** (ELK, Datadog, CloudWatch, etc.)
  - [ ] Connection string validated
  - [ ] Logs shipping successfully to remote service
  - [ ] Dashboard created for monitoring key metrics
- [ ] **Alert thresholds set**:
  - [ ] API error rate > 5% triggers alert
  - [ ] Database connection pool exhausted triggers alert
  - [ ] Failed login attempts spike triggers alert
  - [ ] Webhook failure rate > 10% triggers alert
  - [ ] Transaction timeout > 30s triggers alert
- [ ] **Dashboards created**:
  - [ ] Request latency by endpoint
  - [ ] Error rate trends
  - [ ] Payment success rate
  - [ ] API response times
  - [ ] Database performance (slow queries, connections)
- [ ] **Slack/Email integration** for critical alerts
  - Test alert: Send test message to ops channel
  - Verify it arrives and is readable

### Staging Verification (Full Smoke Tests)
- [ ] **User registration flow**: Complete end-to-end
  - Register new user → Verify email → Set PIN → Set 2FA → Login
  - Verify user in database (PII encrypted)
- [ ] **Wallet operations**: Deposit, transfer, withdrawal
  - Add money to wallet → Send to another user → Check balance
  - Verify transaction in audit log
- [ ] **Payment integrations**: Flutterwave & Vtpass
  - Bill payment with Vtpass → Verify transaction status
  - Virtual account deposit (Flutterwave) → Verify credit
- [ ] **Admin operations**:
  - Login as admin → View users → Run audit report
  - Verify TOTP requirement works
- [ ] **API security checks**:
  - Test expired token → Should get 401
  - Test CSRF without token → Should get 403
  - Test invalid PIN → Should lock account after 5 attempts
  - Test rate limiting → Should throttle after 30 reqs/10min on auth

### Backup & Disaster Recovery
- [ ] **Database backup tested**: Restored to test environment and verified data integrity
- [ ] **Backup automation**: Cron job configured for daily backups
  - [ ] Full backup: `0 2 * * * admin /usr/local/bin/mysql_backup.sh` (2 AM daily)
  - [ ] Incremental backup: `0 */6 * * * admin /usr/local/bin/mysql_incremental.sh` (every 6 hours)
- [ ] **Archive strategy**: Backups shipped to S3/cloud storage
  - [ ] Retention: Keep 30 days of incremental, 7 years of monthly full backups
- [ ] **Disaster recovery plan**: Documented in OPERATIONS.md
  - [ ] RTO: 4 hours (target)
  - [ ] RPO: 1 hour (target)
  - [ ] Recovery procedure tested in last 30 days

---

## Pre-Deployment Day (6 Hours Before Go-Live)

### Final Checks
- [ ] **Status page updated**: "Maintenance window: 2026-04-01 10:00-12:00 UTC+1"
  - Notify users 24 hours in advance
- [ ] **On-call team** briefed and ready
  - [ ] Ops lead: <name> (@<slack>)
  - [ ] Database admin: <name> (@<slack>)
  - [ ] Backend lead: <name> (@<slack>)
  - [ ] Frontend lead: <name> (@<slack>)
  - [ ] On-call engineer availability confirmed
- [ ] **Rollback plan ready**: Document how to revert if critical issue found
  - [ ] Previous version Docker image tagged and ready
  - [ ] Database rollback script: `ROLLBACK TO SAVEPOINT pre_deployment;`
  - [ ] DNS/load balancer configuration to flip back
- [ ] **Communication channels active**:
  - [ ] #gly-vtu-ops Slack channel monitored
  - [ ] War room call ready to start
  - [ ] Customer support notified of maintenance window
- [ ] **Final database backup**: Run full backup again, verify integrity
- [ ] **Production credentials loaded**: `.env.production` available to deploy process
- [ ] **Deployment script tested**: `./scripts/deploy.sh --env production --dry-run` runs without error

---

## Go-Live Deployment Steps

### Phase 1: Preparation (10 minutes)
1. [ ] **Freeze code changes**: No more merges to main branch
2. [ ] **Start deployment war room**: Slack call #gly-vtu-ops + hangout link
3. [ ] **Notify customers**: Send deployment notification (email + in-app banner)
4. [ ] **Verify production prerequisites**:
   - Database accessible: `mysql -u prod_user -p -h prod.db.com -e "SELECT 1;"`
   - Redis accessible: `redis-cli -h prod.redis.com ping`
   - Email service accessible: Test email send
   - Payment gateway accessible: `curl -I https://api.flutterwave.com`
5. [ ] **Create deployment snapshot**: Tag git commit with deployment info
   - `git tag -a deploy-prod-2026-04-01-10:00 -m "Production deployment"`

### Phase 2: Database Migration (15 minutes)
1. [ ] **Run pending migrations**: Any schema changes
   - `npm run migrate:prod`
   - Monitor for errors: `tail -f production.log | grep -i error`
2. [ ] **Verify migration**: Spot-check tables exist, columns are correct
   - Compare schema hash: `mysql-schema-compare prod prod-backup`
3. [ ] **Clear caches**: If using Redis cache layer
   - `redis-cli -h prod.redis.com FLUSHDB`

### Phase 3: Application Deployment (5 minutes)
1. [ ] **Build Docker image**: Final build from current git commit
   - `docker build -t gly-vtu:prod-2026-04-01 .`
2. [ ] **Push to registry**: Ship to Docker Hub/ECR
   - `docker push gly-vtu:prod-2026-04-01`
3. [ ] **Deploy to production**:
   - Kubernetes: `kubectl set image deployment/gly-vtu gly-vtu=gly-vtu:prod-2026-04-01 -n gly-vtu-prod`
   - Docker Compose: Update docker-compose.yml, `docker-compose up -d`
   - Manual: Stop old instances, start new ones
4. [ ] **Verify container health**: Containers running without restart loops
   - `docker ps` shows new image running
   - Logs show no startup errors: `docker logs gly-vtu-prod | grep -i error | head -20`

### Phase 4: Post-Deployment Verification (10 minutes)
1. [ ] **API health check**: Application responding to requests
   - `curl https://api.gly-vtu.com/health` → Should return 200 OK
   - `curl https://api.gly-vtu.com/api/auth/csrf` → Should return CSRF token
2. [ ] **Database connection**: Verify database accessible and responsive
   - `mysql -u prod_user -p -h prod.db.com -e "SELECT COUNT(*) FROM users;"`
   - Latency should be < 100ms
3. [ ] **Smoke tests**: Run automated smoke suite
   - `npm run test:smoke --env production`
   - All 10+ critical user journeys pass
4. [ ] **Monitoring data flowing**: Logs and metrics appearing in dashboards
   - Check logging service: Logs appearing in past 2 minutes
   - Check metrics: Request count, error rate visible
5. [ ] **Error monitoring active**: Sentry/Rollbar seeing errors (if any)
   - Login and verify no critical errors reported
6. [ ] **Payment integrations working**:
   - Test Flutterwave connection: Create test transaction
   - Test Vtpass connection: Get bill provider list
   - Verify webhooks can be received (check webhook delivery logs)

### Phase 5: Performance & Load Testing (Optional, for large deployments)
1. [ ] **Baseline performance**: Measure API latency
   - `ab -n 100 -c 10 https://api.gly-vtu.com/api/user/profile`
   - Expected: p99 latency < 500ms
2. [ ] **Database query performance**: Spot-check slow queries
   - `SHOW PROCESSLIST;` - No queries stuck/running > 10 seconds
3. [ ] **Connection pool health**: Not exhausted
   - `SHOW STATUS LIKE 'Threads%';` - Verify reasonable numbers

### Phase 6: Announcement & Handoff (5 minutes)
1. [ ] **Update status page**: "✅ Deployment complete, all systems normal"
2. [ ] **Notify customers**: Deployment successful notification
3. [ ] **End war room**: Confirm all systems stable for 10 minutes
4. [ ] **Handoff to support**: Support team ready to handle issues
5. [ ] **Document deployment**: Record start time, end time, any issues encountered

---

## Post-Deployment (First 24 Hours)

### Monitoring & Support
- [ ] **Continuous monitoring**: Keep dashboards open for errors/anomalies
- [ ] **Check logs hourly**: Review for any warnings or unusual activity
- [ ] **Monitor payment success rate**: Should be >= 99%
- [ ] **Monitor user registrations**: Watch for failures
- [ ] **Monitor authentication**: Watch for spike in failed logins
- [ ] **Customer support queue**: Respond to any reported issues promptly
- [ ] **Performance tracking**: API latency and error rates normal

### Incident Response
**If critical issue found**:
1. [ ] **Declare incident**: Page on-call team, open war room
2. [ ] **Triage issue**: Identify root cause (code, database, infrastructure)
3. [ ] **Decide**: Fix forward or rollback
   - **Fix forward** if: Issue is minor, fix is quick (< 1 hour)
   - **Rollback** if: Issue is major, users affected,  fix unclear
4. [ ] **Execute rollback** (if necessary):
   - `kubectl set image deployment/gly-vtu gly-vtu=gly-vtu:prod-2026-03-30 -n gly-vtu-prod`
   - Verify old version running
   - Restore database from pre-deployment backup if needed
5. [ ] **Post-incident**: Document what went wrong, prevent recurrence

---

## Rollback Procedure (If Needed)

### Rollback Steps (< 15 minutes)
1. [ ] **Notify stakeholders**: Quick message in #gly-vtu-ops: "Initiating rollback to previous version"
2. [ ] **Stop current deployment**: Health checks disabled temporarily
3. [ ] **Revert application code**:
   - Kubernetes: `kubectl rollout undo deployment/gly-vtu -n gly-vtu-prod`
   - Docker: `docker stop gly-vtu-prod && docker run -d gly-vtu:prod-2026-03-30`
4. [ ] **Revert database** (if schema changed):
   - `mysql -u root -p < gly_vtu_backup_2026-03-31_before_deploy.sql`
   - Or use: `ROLLBACK TO SAVEPOINT pre_deployment_schema;`
5. [ ] **Verify rollback successful**:
   - API health check returns 200
   - Old features working as expected
   - No data loss
6. [ ] **Notify customers**: "Issue detected, reverted to previous version"
7. [ ] **Post-mortem**: Debug what went wrong before re-attempting deployment

---

## Post-Deployment Metrics (First Week)

Track these metrics and compare to baseline:
- **API Error Rate**: Should be <= 0.1%
- **Payment Success Rate**: Should be >= 99.5%
- **API Latency (p99)**: Should be <= 500ms
- **Database Connection Pool**: Should be <= 80% utilized
- **Failed Login Attempts**: Monitor for spike (could indicate brute force)
- **Webhook Delivery Success**: Should be >= 99%
- **User Registrations**: Should be normal

---

## Maintenance Windows & Updates

### Security Patches (High Priority)
- Applied within 24-48 hours if not causing downtime
- If requires downtime: Scheduled during low-traffic window (2-4 AM UTC+1)
- Tested in staging first

### Feature Releases
- Scheduled for first deployment window of month
- Tested thoroughly in staging
- Rollback plan prepared
- Feature flags used for gradual rollout

### Database Maintenance (Low Priority)
- Index optimization: Monthly during low-traffic window
- Table optimization: Quarterly
- Backup testing: Weekly

---

## Documentation & Runbooks

- [ ] Deployment runbook signed off by: <tech lead>
- [ ] Disaster recovery test completed: <date>
- [ ] On-call rotation updated with latest procedures
- [ ] Team trained on deployment process
- [ ] Post-mortem process documented (if incident occurs)