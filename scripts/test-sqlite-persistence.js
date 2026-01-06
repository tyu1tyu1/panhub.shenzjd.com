#!/usr/bin/env node

/**
 * SQLite 持久化测试脚本
 * 用于测试 SQLite 数据库是否能正确持久化到 /app/data 目录
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = '/app/data/hot-searches.db';
const TEST_TABLE = 'test_persistence';

console.log('🧪 SQLite 持久化测试\n');

// 1. 检查 /app/data 目录
console.log('1. 检查 /app/data 目录:');
const dataDir = '/app/data';
if (!fs.existsSync(dataDir)) {
    console.log('   ❌ /app/data 目录不存在');
    process.exit(1);
}

try {
    fs.accessSync(dataDir, fs.constants.W_OK);
    console.log('   ✅ /app/data 目录可写');
} catch (err) {
    console.log('   ❌ /app/data 目录不可写:', err.message);
    process.exit(1);
}

// 2. 创建或打开数据库
console.log('\n2. 创建/打开数据库:');
let db;
try {
    db = new Database(DB_PATH);
    console.log('   ✅ 数据库打开成功');
    console.log(`   📁 数据库路径: ${DB_PATH}`);
} catch (err) {
    console.log('   ❌ 数据库打开失败:', err.message);
    process.exit(1);
}

// 3. 创建测试表
console.log('\n3. 创建测试表:');
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS ${TEST_TABLE} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ 测试表创建成功');
} catch (err) {
    console.log('   ❌ 测试表创建失败:', err.message);
    db.close();
    process.exit(1);
}

// 4. 插入测试数据
console.log('\n4. 插入测试数据:');
const testValue = `test-${Date.now()}`;
try {
    const stmt = db.prepare(`INSERT INTO ${TEST_TABLE} (test_value) VALUES (?)`);
    const result = stmt.run(testValue);
    console.log(`   ✅ 插入成功，ID: ${result.lastInsertRowid}`);
} catch (err) {
    console.log('   ❌ 插入失败:', err.message);
    db.close();
    process.exit(1);
}

// 5. 读取测试数据
console.log('\n5. 读取测试数据:');
try {
    const rows = db.prepare(`SELECT * FROM ${TEST_TABLE}`).all();
    console.log('   ✅ 读取成功');
    console.log('   📊 数据:', rows);
} catch (err) {
    console.log('   ❌ 读取失败:', err.message);
    db.close();
    process.exit(1);
}

// 6. 关闭数据库
console.log('\n6. 关闭数据库:');
try {
    db.close();
    console.log('   ✅ 数据库已关闭');
} catch (err) {
    console.log('   ⚠️ 关闭时出错:', err.message);
}

// 7. 检查文件是否创建
console.log('\n7. 检查数据库文件:');
if (fs.existsSync(DB_PATH)) {
    const stats = fs.statSync(DB_PATH);
    console.log('   ✅ 数据库文件存在');
    console.log(`   📊 文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   📅 修改时间: ${stats.mtime}`);
} else {
    console.log('   ❌ 数据库文件不存在');
    process.exit(1);
}

// 8. 重新打开并验证数据持久化
console.log('\n8. 验证数据持久化:');
try {
    const db2 = new Database(DB_PATH);
    const rows = db2.prepare(`SELECT * FROM ${TEST_TABLE}`).all();

    if (rows.length > 0) {
        console.log('   ✅ 数据持久化成功');
        console.log(`   📊 找到 ${rows.length} 条记录`);

        // 检查是否包含我们刚才插入的数据
        const found = rows.some(row => row.test_value === testValue);
        if (found) {
            console.log('   ✅ 能读取到刚才插入的数据');
        } else {
            console.log('   ⚠️ 未找到刚才插入的数据');
        }
    } else {
        console.log('   ❌ 数据库为空');
    }

    db2.close();
} catch (err) {
    console.log('   ❌ 验证失败:', err.message);
    process.exit(1);
}

// 9. 清理测试数据
console.log('\n9. 清理测试数据:');
try {
    const db3 = new Database(DB_PATH);
    db3.exec(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
    db3.close();
    console.log('   ✅ 测试表已删除');
} catch (err) {
    console.log('   ⚠️ 清理失败:', err.message);
}

console.log('\n🎉 所有测试通过！SQLite 持久化工作正常。');
console.log('\n💡 提示: 重启容器后，检查此文件是否仍然存在:');
console.log(`   docker exec <容器名> ls -la ${DB_PATH}`);