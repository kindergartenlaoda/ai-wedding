import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('\n📊 生成数据可视化报告...\n');

    // 1. 获取所有数据
    const domains = await prisma.domains.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    });

    const templates = await prisma.templates.findMany({
      where: { is_active: true },
    });

    const projects = await prisma.projects.findMany();
    const generations = await prisma.generations.findMany();

    // 2. 生成 HTML 可视化报告
    const html = generateHTMLReport(domains, templates, projects, generations);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `visualization-${timestamp}.html`;
    const filepath = join(process.cwd(), 'scripts', 'exports', filename);

    writeFileSync(filepath, html, 'utf-8');
    console.log(`✅ HTML 可视化报告: ${filepath}\n`);

    // 3. 生成 CSV 数据
    const csvTemplates = generateTemplatesCSV(templates, domains);
    const csvFilename = `templates-${timestamp}.csv`;
    const csvFilepath = join(process.cwd(), 'scripts', 'exports', csvFilename);
    writeFileSync(csvFilepath, csvTemplates, 'utf-8');
    console.log(`✅ Templates CSV: ${csvFilepath}\n`);

    const csvDomains = generateDomainsCSV(domains, templates);
    const csvDomainsFilename = `domains-${timestamp}.csv`;
    const csvDomainsFilepath = join(process.cwd(), 'scripts', 'exports', csvDomainsFilename);
    writeFileSync(csvDomainsFilepath, csvDomains, 'utf-8');
    console.log(`✅ Domains CSV: ${csvDomainsFilepath}\n`);

    console.log('📊 数据可视化报告生成完成！');
    console.log(`\n💡 在浏览器中打开: file://${filepath}\n`);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function generateHTMLReport(domains: any[], templates: any[], projects: any[], generations: any[]): string {
  const templatesByDomain = templates.reduce((acc, t) => {
    if (!acc[t.domain]) acc[t.domain] = [];
    acc[t.domain].push(t);
    return acc;
  }, {} as Record<string, any[]>);

  const domainStats = domains.map((d) => {
    const domainTemplates = templatesByDomain[d.slug] || [];
    const prices = domainTemplates.map((t) => t.price_credits);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    return {
      name: d.name,
      slug: d.slug,
      templateCount: domainTemplates.length,
      avgPrice: avgPrice.toFixed(1),
      requireFaceDetection: d.require_face_detection,
    };
  });

  const priceDistribution = [
    { range: '1-5', count: templates.filter((t) => t.price_credits >= 1 && t.price_credits <= 5).length },
    { range: '6-10', count: templates.filter((t) => t.price_credits >= 6 && t.price_credits <= 10).length },
    { range: '11-15', count: templates.filter((t) => t.price_credits >= 11 && t.price_credits <= 15).length },
    { range: '16+', count: templates.filter((t) => t.price_credits >= 16).length },
  ];

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Wedding Platform - 数据可视化报告</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .header p { font-size: 1.1em; opacity: 0.9; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 40px;
      background: #f8f9fa;
    }
    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      text-align: center;
      transition: transform 0.3s;
    }
    .stat-card:hover { transform: translateY(-5px); }
    .stat-card .number {
      font-size: 2.5em;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
    }
    .stat-card .label {
      font-size: 1em;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .charts-section {
      padding: 40px;
    }
    .chart-container {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .chart-container h2 {
      margin-bottom: 20px;
      color: #333;
      font-size: 1.5em;
    }
    .chart-wrapper {
      position: relative;
      height: 400px;
    }
    .table-section {
      padding: 40px;
      background: #f8f9fa;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 15px;
      border-bottom: 1px solid #eee;
    }
    tr:hover { background: #f8f9fa; }
    .badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .footer {
      text-align: center;
      padding: 30px;
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 AI Wedding Platform</h1>
      <p>数据可视化报告 - ${new Date().toLocaleDateString('zh-CN')}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="number">${domains.length}</div>
        <div class="label">Domains</div>
      </div>
      <div class="stat-card">
        <div class="number">${templates.length}</div>
        <div class="label">Templates</div>
      </div>
      <div class="stat-card">
        <div class="number">${projects.length}</div>
        <div class="label">Projects</div>
      </div>
      <div class="stat-card">
        <div class="number">${generations.length}</div>
        <div class="label">Generations</div>
      </div>
      <div class="stat-card">
        <div class="number">${(templates.reduce((sum, t) => sum + t.price_credits, 0) / templates.length).toFixed(1)}</div>
        <div class="label">Avg Price</div>
      </div>
      <div class="stat-card">
        <div class="number">${domains.filter((d) => d.require_face_detection).length}</div>
        <div class="label">Face Detection</div>
      </div>
    </div>

    <div class="charts-section">
      <div class="chart-container">
        <h2>📊 模板数量分布</h2>
        <div class="chart-wrapper">
          <canvas id="templateDistChart"></canvas>
        </div>
      </div>

      <div class="chart-container">
        <h2>💰 价格区间分布</h2>
        <div class="chart-wrapper">
          <canvas id="priceDistChart"></canvas>
        </div>
      </div>

      <div class="chart-container">
        <h2>📈 平均价格对比</h2>
        <div class="chart-wrapper">
          <canvas id="avgPriceChart"></canvas>
        </div>
      </div>
    </div>

    <div class="table-section">
      <h2 style="margin-bottom: 20px; color: #333;">🎯 Domain 详细信息</h2>
      <table>
        <thead>
          <tr>
            <th>Domain</th>
            <th>模板数</th>
            <th>平均价格</th>
            <th>人脸检测</th>
          </tr>
        </thead>
        <tbody>
          ${domainStats
            .map(
              (stat) => `
            <tr>
              <td><strong>${stat.name}</strong></td>
              <td>${stat.templateCount}</td>
              <td>${stat.avgPrice} credits</td>
              <td>${stat.requireFaceDetection ? '<span class="badge badge-success">✅ 启用</span>' : '<span class="badge badge-warning">❌ 未启用</span>'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Generated by AI Wedding Platform Data Management System</p>
      <p>© 2026 AI Wedding Platform. All rights reserved.</p>
    </div>
  </div>

  <script>
    // 模板数量分布图
    new Chart(document.getElementById('templateDistChart'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(domainStats.map((s) => s.name))},
        datasets: [{
          label: '模板数量',
          data: ${JSON.stringify(domainStats.map((s) => s.templateCount))},
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // 价格区间分布图
    new Chart(document.getElementById('priceDistChart'), {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(priceDistribution.map((p) => p.range + ' credits'))},
        datasets: [{
          data: ${JSON.stringify(priceDistribution.map((p) => p.count))},
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(237, 100, 166, 0.8)',
            'rgba(255, 154, 158, 0.8)'
          ],
          borderWidth: 2,
          borderColor: 'white'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });

    // 平均价格对比图
    new Chart(document.getElementById('avgPriceChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(domainStats.map((s) => s.name))},
        datasets: [{
          label: '平均价格 (credits)',
          data: ${JSON.stringify(domainStats.map((s) => parseFloat(s.avgPrice)))},
          backgroundColor: 'rgba(102, 126, 234, 0.2)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  </script>
</body>
</html>`;
}

function generateTemplatesCSV(templates: any[], domains: any[]): string {
  let csv = 'ID,Name,Domain,Domain Name,Category,Price,Active,Sort Order,Has Preview,Has Base Prompt\n';

  templates.forEach((t) => {
    const domain = domains.find((d) => d.slug === t.domain);
    const domainName = domain?.name || t.domain;
    const hasPreview = t.preview_image_url ? 'Yes' : 'No';
    const promptConfig = t.prompt_config as any;
    const hasBasePrompt = promptConfig?.basePrompt ? 'Yes' : 'No';

    csv += `"${t.id}","${t.name}","${t.domain}","${domainName}","${t.category}",${t.price_credits},${t.is_active ? 'Yes' : 'No'},${t.sort_order},"${hasPreview}","${hasBasePrompt}"\n`;
  });

  return csv;
}

function generateDomainsCSV(domains: any[], templates: any[]): string {
  let csv = 'ID,Slug,Name,Description,Icon,Color,Active,Sort Order,Face Detection,Template Count,Avg Price\n';

  domains.forEach((d) => {
    const domainTemplates = templates.filter((t) => t.domain === d.slug);
    const templateCount = domainTemplates.length;
    const prices = domainTemplates.map((t) => t.price_credits);
    const avgPrice = prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(1) : '0';

    csv += `"${d.id}","${d.slug}","${d.name}","${d.description}","${d.icon}","${d.color}",${d.is_active ? 'Yes' : 'No'},${d.sort_order},${d.require_face_detection ? 'Yes' : 'No'},${templateCount},${avgPrice}\n`;
  });

  return csv;
}

main();
