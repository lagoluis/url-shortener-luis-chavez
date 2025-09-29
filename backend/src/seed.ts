import { prisma } from './db';

const SAMPLE_LINKS = [
  {
    slug: 'demo-github',
    targetUrl: 'https://github.com/features'
  },
  {
    slug: 'google',
    targetUrl: 'https://google.com'
  },
  {
    slug: 'stack-overflow',
    targetUrl: 'https://stackoverflow.com'
  }
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/109.0 Firefox/117.0',
  'curl/8.0.1',
  'PostmanRuntime/7.32.3'
];

// Deterministic click pattern for 7 days (totaling ~120 clicks)
const DAILY_CLICK_COUNTS = [20, 15, 25, 12, 18, 22, 8]; // = 120 total

async function main() {
  console.log('🌱 Starting seed process...');

  // Check if data already exists
  const existingLinksCount = await prisma.link.count();
  if (existingLinksCount > 0) {
    console.log('⚠️  Data already exists. Clearing existing data...');
    await prisma.click.deleteMany({});
    await prisma.link.deleteMany({});
    console.log('🧹 Cleared existing data');
  }

  // Create sample links
  console.log('📝 Creating sample links...');
  const createdLinks = [];
  
  for (const linkData of SAMPLE_LINKS) {
    const link = await prisma.link.create({
      data: linkData
    });
    createdLinks.push(link);
    console.log(`  ✓ Created link: ${link.slug} -> ${link.targetUrl}`);
  }

  // Generate clicks for all links over the last 7 days
  console.log('👆 Generating clicks for all links over last 7 days...');
  let totalClicksCreated = 0;
  const linkStats: { [slug: string]: number } = {};
  
  // Different click patterns for each link to make analytics interesting
  const linkClickPatterns: { [key: string]: number[] } = {
    'demo-github': DAILY_CLICK_COUNTS, // Heavy usage (original pattern)
    'google': [8, 12, 15, 7, 11, 9, 13], // Moderate usage  
    'stack-overflow': [3, 5, 7, 4, 6, 8, 2] // Light usage
  };

  // Work backwards from today
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999); // End of today

  for (const link of createdLinks) {
    const clickPattern = linkClickPatterns[link.slug] || [1, 2, 1, 3, 2, 1, 2]; // Default light pattern
    let linkClicksCreated = 0;
    
    console.log(`  🔗 Generating clicks for "${link.slug}"...`);

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dayClickCount = clickPattern[dayOffset];
      const targetDate = new Date(today);
      targetDate.setUTCDate(today.getUTCDate() - dayOffset);
      
      // Set to start of the day for this iteration
      targetDate.setUTCHours(0, 0, 0, 0);
      
      console.log(`    📅 Day ${dayOffset + 1} (${targetDate.toISOString().split('T')[0]}): ${dayClickCount} clicks`);

      // Distribute clicks throughout the day
      for (let clickIndex = 0; clickIndex < dayClickCount; clickIndex++) {
        // Spread clicks throughout the day (0-23 hours)
        const hour = Math.floor((clickIndex * 24) / dayClickCount);
        const minute = (clickIndex * 37 + link.slug.length * 11) % 60; // Deterministic but varied minutes
        const second = (clickIndex * 17 + link.slug.length * 7) % 60; // Deterministic but varied seconds
        
        const clickTime = new Date(targetDate);
        clickTime.setUTCHours(hour, minute, second, clickIndex % 1000);
        
        // Select user agent deterministically (different pattern per link)
        const userAgent = USER_AGENTS[(clickIndex + link.slug.length * 3) % USER_AGENTS.length];
        
        await prisma.click.create({
          data: {
            linkId: link.id,
            tsUtc: clickTime,
            userAgent
          }
        });
        
        linkClicksCreated++;
        totalClicksCreated++;
      }
    }
    
    linkStats[link.slug] = linkClicksCreated;
  }

  console.log(`✅ Seed completed successfully!`);
  console.log(`   📊 Created ${createdLinks.length} links`);
  console.log(`   👆 Created ${totalClicksCreated} total clicks across all links`);
  console.log(`   🎯 Analytics should now show data for the last 7 days`);
  
  // Show breakdown by link
  console.log('\n📈 Clicks per link:');
  for (const [slug, count] of Object.entries(linkStats)) {
    console.log(`   ${slug}: ${count} clicks`);
  }
  
  // Show total analytics preview for the first link (demo-github)
  const firstLink = createdLinks[0];
  console.log('\n📊 Sample analytics preview (demo-github):');
  const totalClicks = await prisma.click.count({
    where: { linkId: firstLink.id }
  });
  
  const last7Days = new Date();
  last7Days.setUTCDate(last7Days.getUTCDate() - 7);
  
  const recentClicks = await prisma.click.count({
    where: {
      linkId: firstLink.id,
      tsUtc: { gte: last7Days }
    }
  });
  
  console.log(`   Total clicks: ${totalClicks}`);
  console.log(`   Clicks in last 7 days: ${recentClicks}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
