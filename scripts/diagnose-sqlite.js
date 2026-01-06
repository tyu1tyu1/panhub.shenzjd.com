#!/usr/bin/env node

/**
 * SQLite 诊断脚本
 * 用于在 Docker 容器内诊断 better-sqlite3 安装状态
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始诊断 better-sqlite3 安装状态...\n');

// 1. 检查 node_modules 是否存在
console.log('1. 检查 node_modules 目录:');
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
    console.log('   ✅ node_modules 存在');
} else {
    console.log('   ❌ node_modules 不存在');
    process.exit(1);
}

// 2. 检查 better-sqlite3 包是否存在
console.log('\n2. 检查 better-sqlite3 包:');
const betterSqlite3Path = path.join(nodeModulesPath, 'better-sqlite3');
if (fs.existsSync(betterSqlite3Path)) {
    console.log('   ✅ better-sqlite3 包存在');

    // 检查 package.json
    const pkgPath = path.join(betterSqlite3Path, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = require(pkgPath);
        console.log(`   📦 版本: ${pkg.version}`);
    }
} else {
    console.log('   ❌ better-sqlite3 包不存在');
    process.exit(1);
}

// 3. 检查编译产物
console.log('\n3. 检查编译产物:');
const buildPath = path.join(betterSqlite3Path, 'build');
const releasePath = path.join(buildPath, 'Release');

if (fs.existsSync(releasePath)) {
    console.log('   ✅ build/Release 目录存在');

    // 列出目录内容
    try {
        const files = fs.readdirSync(releasePath);
        console.log('   📁 目录内容:', files);

        const nodeFile = files.find(f => f.endsWith('.node'));
        if (nodeFile) {
            console.log(`   ✅ 找到原生模块: ${nodeFile}`);

            // 检查文件大小
            const stats = fs.statSync(path.join(releasePath, nodeFile));
            console.log(`   📊 文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
        } else {
            console.log('   ❌ 未找到 .node 原生模块文件');
        }
    } catch (err) {
        console.log('   ❌ 无法读取目录:', err.message);
    }
} else {
    console.log('   ❌ build/Release 目录不存在');
    console.log('   📁 检查 build 目录是否存在:');

    if (fs.existsSync(buildPath)) {
        console.log('   ✅ build 目录存在');
        try {
            const buildContents = fs.readdirSync(buildPath);
            console.log('   📁 build 目录内容:', buildContents);
        } catch (err) {
            console.log('   ❌ 无法读取 build 目录:', err.message);
        }
    } else {
        console.log('   ❌ build 目录不存在');
    }
}

// 4. 尝试加载 better-sqlite3
console.log('\n4. 尝试加载 better-sqlite3:');
try {
    const betterSqlite3 = require('better-sqlite3');
    console.log('   ✅ better-sqlite3 加载成功');

    // 5. 尝试创建数据库
    console.log('\n5. 尝试创建测试数据库:');
    const testDbPath = '/tmp/test-sqlite.db';

    try {
        const db = betterSqlite3(testDbPath);

        // 创建测试表
        db.exec(`
            CREATE TABLE IF NOT EXISTS test (
                id INTEGER PRIMARY KEY,
                value TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 插入测试数据
        const stmt = db.prepare('INSERT INTO test (value) VALUES (?)');
        stmt.run('test-value');

        // 查询数据
        const row = db.prepare('SELECT * FROM test WHERE id = 1').get();

        console.log('   ✅ 数据库操作成功');
        console.log('   📊 测试数据:', row);

        // 清理
        db.close();
        try {
            fs.unlinkSync(testDbPath);
            console.log('   🧹 测试文件已清理');
        } catch (e) {
            console.log('   ⚠️ 无法清理测试文件:', e.message);
        }

        console.log('\n🎉 所有诊断通过！better-sqlite3 工作正常。');
        process.exit(0);

    } catch (dbError) {
        console.log('   ❌ 数据库操作失败:', dbError.message);
        console.log('   💡 可能原因: 文件系统权限、磁盘空间等');
        process.exit(1);
    }

} catch (loadError) {
    console.log('   ❌ better-sqlite3 加载失败:', loadError.message);

    if (loadError.message.includes('Cannot find module')) {
        console.log('   💡 建议: 检查 npm install 是否成功执行');
    } else if (loadError.message.includes('bindings')) {
        console.log('   💡 建议: 原生模块未正确编译，尝试重新安装');
        console.log('   💡 命令: npm rebuild better-sqlite3');
    } else if (loadError.message.includes('libc')) {
        console.log('   💡 建议: glibc/musl 版本不兼容，检查基础镜像');
    } else {
        console.log('   💡 建议: 查看完整错误信息进行排查');
    }

    process.exit(1);
}

// 6. 系统信息
console.log('\n6. 系统信息:');
console.log('   🖥️  平台:', process.platform);
console.log('   🏗️  架构:', process.arch);
console.log('   🔧  Node.js:', process.version);
console.log('   📁  工作目录:', process.cwd());

console.log('\n📋 诊断完成');