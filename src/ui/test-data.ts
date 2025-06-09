import { ERDiagramData, EntityInfo, RelationInfo } from '../types';

/**
 * 测试用的ER图数据
 * 用于验证WebView界面的显示效果
 */
export const testERData: ERDiagramData = {
    entities: [
        {
            className: 'User',
            tableName: 'user',
            comment: '用户表',
            filePath: '/src/main/java/com/example/entity/User.java',
            annotations: [
                {
                    name: 'TableName',
                    attributes: { value: 'user' }
                }
            ],
            fields: [
                {
                    fieldName: 'id',
                    columnName: 'id',
                    javaType: 'Long',
                    isPrimaryKey: true,
                    isNotNull: true,
                    isUnique: true,
                    comment: '用户ID'
                },
                {
                    fieldName: 'username',
                    columnName: 'username',
                    javaType: 'String',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: true,
                    comment: '用户名'
                },
                {
                    fieldName: 'email',
                    columnName: 'email',
                    javaType: 'String',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: true,
                    comment: '邮箱'
                },
                {
                    fieldName: 'createTime',
                    columnName: 'create_time',
                    javaType: 'LocalDateTime',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: false,
                    comment: '创建时间'
                }
            ]
        },
        {
            className: 'Order',
            tableName: 'order',
            comment: '订单表',
            filePath: '/src/main/java/com/example/entity/Order.java',
            annotations: [
                {
                    name: 'TableName',
                    attributes: { value: 'order' }
                }
            ],
            fields: [
                {
                    fieldName: 'id',
                    columnName: 'id',
                    javaType: 'Long',
                    isPrimaryKey: true,
                    isNotNull: true,
                    isUnique: true,
                    comment: '订单ID'
                },
                {
                    fieldName: 'userId',
                    columnName: 'user_id',
                    javaType: 'Long',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: false,
                    comment: '用户ID'
                },
                {
                    fieldName: 'orderNo',
                    columnName: 'order_no',
                    javaType: 'String',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: true,
                    comment: '订单号'
                },
                {
                    fieldName: 'totalAmount',
                    columnName: 'total_amount',
                    javaType: 'BigDecimal',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: false,
                    comment: '总金额'
                },
                {
                    fieldName: 'status',
                    columnName: 'status',
                    javaType: 'Integer',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: false,
                    comment: '订单状态'
                },
                {
                    fieldName: 'createTime',
                    columnName: 'create_time',
                    javaType: 'LocalDateTime',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: false,
                    comment: '创建时间'
                }
            ]
        },
        {
            className: 'OrderItem',
            tableName: 'order_item',
            comment: '订单项表',
            filePath: '/src/main/java/com/example/entity/OrderItem.java',
            annotations: [
                {
                    name: 'TableName',
                    attributes: { value: 'order_item' }
                }
            ],
            fields: [
                {
                    fieldName: 'id',
                    columnName: 'id',
                    javaType: 'Long',
                    isPrimaryKey: true,
                    isNotNull: true,
                    isUnique: true,
                    comment: '订单项ID'
                },
                {
                    fieldName: 'orderId',
                    columnName: 'order_id',
                    javaType: 'Long',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: false,
                    comment: '订单ID'
                },
                {
                    fieldName: 'productId',
                    columnName: 'product_id',
                    javaType: 'Long',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: false,
                    comment: '产品ID'
                },
                {
                    fieldName: 'quantity',
                    columnName: 'quantity',
                    javaType: 'Integer',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: false,
                    comment: '数量'
                },
                {
                    fieldName: 'price',
                    columnName: 'price',
                    javaType: 'BigDecimal',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: false,
                    comment: '单价'
                }
            ]
        },
        {
            className: 'Product',
            tableName: 'product',
            comment: '产品表',
            filePath: '/src/main/java/com/example/entity/Product.java',
            annotations: [
                {
                    name: 'TableName',
                    attributes: { value: 'product' }
                }
            ],
            fields: [
                {
                    fieldName: 'id',
                    columnName: 'id',
                    javaType: 'Long',
                    isPrimaryKey: true,
                    isNotNull: true,
                    isUnique: true,
                    comment: '产品ID'
                },
                {
                    fieldName: 'name',
                    columnName: 'name',
                    javaType: 'String',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: false,
                    comment: '产品名称'
                },
                {
                    fieldName: 'description',
                    columnName: 'description',
                    javaType: 'String',
                    isPrimaryKey: false,
                    isNotNull: false,
                    isUnique: false,
                    comment: '产品描述'
                },
                {
                    fieldName: 'price',
                    columnName: 'price',
                    javaType: 'BigDecimal',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: false,
                    comment: '价格'
                },
                {
                    fieldName: 'stock',
                    columnName: 'stock',
                    javaType: 'Integer',
                    isPrimaryKey: false,
                    isNotNull: true,
                    isUnique: false,
                    comment: '库存'
                }
            ]
        }
    ],
    relations: [
        {
            fromTable: 'user',
            toTable: 'order',
            fromField: 'id',
            toField: 'user_id',
            type: 'one-to-many',
            confidence: 0.95,
            source: 'naming-convention',
            description: '用户与订单的一对多关系'
        },
        {
            fromTable: 'order',
            toTable: 'order_item',
            fromField: 'id',
            toField: 'order_id',
            type: 'one-to-many',
            confidence: 0.95,
            source: 'naming-convention',
            description: '订单与订单项的一对多关系'
        },
        {
            fromTable: 'product',
            toTable: 'order_item',
            fromField: 'id',
            toField: 'product_id',
            type: 'one-to-many',
            confidence: 0.95,
            source: 'naming-convention',
            description: '产品与订单项的一对多关系'
        }
    ]
};

/**
 * 生成测试用的Mermaid ER图代码
 */
export function generateTestMermaidCode(): string {
    return `erDiagram
    USER {
        bigint id PK NOT NULL "用户ID"
        varchar username NOT NULL UNIQUE "用户名"
        varchar email NOT NULL UNIQUE "邮箱"
        datetime create_time NOT NULL "创建时间"
    }

    ORDER {
        bigint id PK NOT NULL "订单ID"
        bigint user_id NOT NULL "用户ID"
        varchar order_no NOT NULL UNIQUE "订单号"
        decimal total_amount NOT NULL "总金额"
        int status NOT NULL "订单状态"
        datetime create_time NOT NULL "创建时间"
    }

    ORDER_ITEM {
        bigint id PK NOT NULL "订单项ID"
        bigint order_id NOT NULL "订单ID"
        bigint product_id NOT NULL "产品ID"
        int quantity NOT NULL "数量"
        decimal price NOT NULL "单价"
    }

    PRODUCT {
        bigint id PK NOT NULL "产品ID"
        varchar name NOT NULL "产品名称"
        varchar description "产品描述"
        decimal price NOT NULL "价格"
        int stock NOT NULL "库存"
    }

    USER ||--o{ ORDER : "id-user_id"
    ORDER ||--o{ ORDER_ITEM : "id-order_id"
    PRODUCT ||--o{ ORDER_ITEM : "id-product_id"`;
} 