import { SmartJavaParser } from './java-parser';

/**
 * 简单的Java解析器测试
 */
export class JavaParserTest {
    private parser: SmartJavaParser;

    constructor() {
        this.parser = new SmartJavaParser();
    }

    /**
     * 测试基本实体类解析
     */
    async testBasicEntityParsing(): Promise<void> {
        console.log('🧪 开始测试Java解析器...');

        // 测试用例1：标准的JPA实体类
        const jpaEntityCode = `
package com.example.entity;

import javax.persistence.*;
import java.util.Date;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "username", nullable = false)
    private String username;
    
    @Column(name = "email")
    private String email;
    
    @Column(name = "created_at")
    private Date createdAt;
    
    // getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
}
        `;

        try {
            const result1 = await this.parser.parseJavaFile('User.java', jpaEntityCode);
            if (result1) {
                console.log('✅ JPA实体类解析成功:', {
                    className: result1.className,
                    tableName: result1.tableName,
                    fieldCount: result1.fields.length,
                    parseMethod: result1.parseMethod,
                    confidence: result1.confidence
                });
            } else {
                console.log('❌ JPA实体类解析失败: 返回null');
            }
        } catch (error) {
            console.log('❌ JPA实体类解析异常:', error);
        }

        // 测试用例2：MyBatis-Plus实体类
        const mybatisPlusEntityCode = `
package com.example.model;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

@Data
@TableName("products")
public class Product {
    @TableId(type = IdType.AUTO)
    private Long id;
    
    @TableField("product_name")
    private String productName;
    
    @TableField("price")
    private Double price;
    
    @TableField("category_id")
    private Long categoryId;
}
        `;

        try {
            const result2 = await this.parser.parseJavaFile('Product.java', mybatisPlusEntityCode);
            if (result2) {
                console.log('✅ MyBatis-Plus实体类解析成功:', {
                    className: result2.className,
                    tableName: result2.tableName,
                    fieldCount: result2.fields.length,
                    parseMethod: result2.parseMethod,
                    confidence: result2.confidence
                });
            } else {
                console.log('❌ MyBatis-Plus实体类解析失败: 返回null');
            }
        } catch (error) {
            console.log('❌ MyBatis-Plus实体类解析异常:', error);
        }

        // 测试用例3：简单的POJO类（应该被识别为实体类）
        const pojoCode = `
package com.example.pojo;

public class Customer {
    private Long id;
    private String name;
    private String phone;
    private String address;
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
        `;

        try {
            const result3 = await this.parser.parseJavaFile('Customer.java', pojoCode);
            if (result3) {
                console.log('✅ POJO类解析成功:', {
                    className: result3.className,
                    tableName: result3.tableName,
                    fieldCount: result3.fields.length,
                    parseMethod: result3.parseMethod,
                    confidence: result3.confidence
                });
            } else {
                console.log('❌ POJO类解析失败: 返回null');
            }
        } catch (error) {
            console.log('❌ POJO类解析异常:', error);
        }

        // 测试用例4：工具类（应该被排除）
        const utilityCode = `
package com.example.util;

public class StringUtils {
    private static final String EMPTY = "";
    
    public static boolean isEmpty(String str) {
        return str == null || str.length() == 0;
    }
    
    public static String trim(String str) {
        return str == null ? null : str.trim();
    }
}
        `;

        try {
            const result4 = await this.parser.parseJavaFile('StringUtils.java', utilityCode);
            if (result4) {
                console.log('⚠️ 工具类被错误识别为实体类:', {
                    className: result4.className,
                    tableName: result4.tableName,
                    fieldCount: result4.fields.length
                });
            } else {
                console.log('✅ 工具类正确被排除');
            }
        } catch (error) {
            console.log('❌ 工具类解析异常:', error);
        }

        // 获取解析器状态
        const status = this.parser.getParserStatus();
        console.log('📊 解析器状态:', status);

        console.log('🧪 测试完成!');
    }

    /**
     * 测试解析器状态
     */
    testParserStatus(): void {
        console.log('🔍 检查解析器状态...');
        
        const status = this.parser.getParserStatus();
        console.log('解析器状态报告:', {
            isWorkerThread: status.isWorkerThread,
            vscodeApiAvailable: status.vscodeApiAvailable,
            javaExtensionAvailable: status.javaExtensionAvailable,
            recommendedStrategy: status.recommendedStrategy,
            statusMessage: status.statusMessage
        });
    }
}

// 导出测试函数供外部调用
export async function runJavaParserTest(): Promise<void> {
    const test = new JavaParserTest();
    test.testParserStatus();
    await test.testBasicEntityParsing();
} 