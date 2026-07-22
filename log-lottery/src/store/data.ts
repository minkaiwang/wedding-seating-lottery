import type { IMusic, IPersonConfig, IPrizeConfig } from '@/types/storeType'

const prizeImageUrl = (fileName: string) => `${import.meta.env.BASE_URL}resource/image/${fileName}`
type IPersonConfigWithoutUuid = Omit<IPersonConfig, 'uuid'>
export const defaultPersonList = <IPersonConfigWithoutUuid[]>
    [
        { uid: 'U100156001', name: '朱厚熜', department: '皇室', identity: '万岁爷', avatar: '', x: 1, y: 1, id: 0, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156002', name: '朱载垕', department: '皇室', identity: '裕王', avatar: '', x: 2, y: 1, id: 1, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156003', name: '朱翊钧 ', department: '皇室', identity: '裕王世子', avatar: '', x: 3, y: 1, id: 2, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156004', name: '严嵩', department: '内阁', identity: '首辅', avatar: '', x: 4, y: 1, id: 3, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156005', name: '徐阶', department: '内阁', identity: '次辅、户部尚书', avatar: '', x: 5, y: 1, id: 4, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156006', name: '张居正', department: '内阁', identity: '阁臣、兵部侍郞', avatar: '', x: 6, y: 1, id: 5, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156007', name: '高拱', department: '内阁', identity: '阁臣、户部侍郞', avatar: '', x: 7, y: 1, id: 6, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156008', name: '严世蕃', department: '内阁', identity: '吏部侍郞', avatar: '', x: 8, y: 1, id: 7, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156009', name: '胡宗宪', department: '大臣', identity: '浙直总督', avatar: '', x: 9, y: 1, id: 8, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156010', name: '戚继光', department: '大臣', identity: '都督佥事', avatar: '', x: 10, y: 1, id: 9, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156011', name: '高瀚文', department: '大臣', identity: '杭州知府', avatar: '', x: 11, y: 1, id: 10, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156012', name: '赵贞吉', department: '大臣', identity: '江苏巡抚', avatar: '', x: 12, y: 1, id: 11, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156013', name: '海瑞', department: '大臣', identity: '淳安知县', avatar: '', x: 13, y: 1, id: 12, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156014', name: '何茂才', department: '大臣', identity: '浙江布政使兼按察使', avatar: '', x: 14, y: 1, id: 13, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156015', name: '郑泌昌', department: '大臣', identity: '浙江巡抚', avatar: '', x: 15, y: 1, id: 14, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156016', name: '王用汲', department: '大臣', identity: '建德知县', avatar: '', x: 16, y: 1, id: 15, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156017', name: '谭纶', department: '大臣', identity: '浙直总督府参军', avatar: '', x: 17, y: 1, id: 16, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156018', name: '朱七', department: '大臣', identity: '北镇抚司', avatar: '', x: 1, y: 2, id: 17, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156019', name: '罗龙文', department: '大臣', identity: '通政使司通政使', avatar: '', x: 2, y: 2, id: 18, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156020', name: '马宁远', department: '大臣', identity: '杭州知府', avatar: '', x: 3, y: 2, id: 19, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156021', name: '田有禄 ', department: '大臣', identity: '淳安县丞', avatar: '', x: 4, y: 2, id: 20, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156022', name: '周云逸', department: '大臣', identity: '钦天监监正', avatar: '', x: 5, y: 2, id: 21, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156023', name: '蒋千户', department: '大臣', identity: '浙江按察使司', avatar: '', x: 6, y: 2, id: 22, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156024', name: '徐千户', department: '大臣', identity: '浙江按察使司', avatar: '', x: 7, y: 2, id: 23, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156025', name: '王牢头 ', department: '大臣', identity: '牢头', avatar: '', x: 8, y: 2, id: 24, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156026', name: '赵班头', department: '大臣', identity: '班头', avatar: '', x: 9, y: 2, id: 25, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156027', name: '吕芳', department: '太监', identity: '掌印太监', avatar: '', x: 10, y: 2, id: 26, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156028', name: '杨金水', department: '太监', identity: '织造局', avatar: '', x: 11, y: 2, id: 27, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156029', name: '陈洪', department: '太监', identity: '首席秉笔太监', avatar: '', x: 12, y: 2, id: 28, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156030', name: '黄锦', department: '太监', identity: '秉笔太监', avatar: '', x: 13, y: 2, id: 29, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156031', name: '李玄', department: '太监', identity: '新安江河道监管', avatar: '', x: 14, y: 2, id: 30, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156032', name: '冯保', department: '太监', identity: '世子大伴', avatar: '', x: 15, y: 2, id: 31, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156033', name: '李时珍', department: '江湖', identity: '名医', avatar: '', x: 16, y: 2, id: 32, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156034', name: '沈一石 ', department: '江湖', identity: '商人', avatar: '', x: 17, y: 2, id: 33, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156035', name: '井上十四郎', department: '江湖', identity: '倭寇', avatar: '', x: 1, y: 3, id: 34, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
        { uid: 'U100156036', name: '芸娘', department: '江湖', avatar: '', x: 2, y: 3, id: 35, isWin: false, createTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', updateTime: 'Tue Jan 09 2024 23:20:07 GMT+0800 (China Standard Time)', prizeName: [], prizeTime: [], prizeId: [] },
    ]

// Deliberately empty: users can upload music they are licensed to use.
// Earlier upstream defaults pointed at a third-party host and included
// commercial track names without a repository-verifiable license record.
export const defaultMusicList: IMusic[] = []

export const defaultPrizeList = <IPrizeConfig[]>[
    {
        id: '001',
        name: '三等奖',
        sort: 1,
        isAll: false,
        count: 3,
        isUsedCount: 0,
        picture: {
            id: '2',
            name: '三等奖',
            url: prizeImageUrl('image3.svg'),
        },
        separateCount: {
            enable: true,
            countList: [],
        },
        desc: '三等奖',
        isShow: true,
        isUsed: false,
        frequency: 1,
    },
    {
        id: '002',
        name: '二等奖',
        sort: 2,
        isAll: false,
        count: 2,
        isUsedCount: 0,
        picture: {
            id: '1',
            name: '二等奖',
            url: prizeImageUrl('image2.svg'),
        },
        separateCount: {
            enable: false,
            countList: [],
        },
        desc: '二等奖',
        isShow: true,
        isUsed: false,
        frequency: 1,
    },
    {
        id: '003',
        name: '一等奖',
        sort: 3,
        isAll: false,
        count: 1,
        isUsedCount: 0,
        picture: {
            id: '0',
            name: '一等奖',
            url: prizeImageUrl('image1.svg'),
        },
        separateCount: {
            enable: false,
            countList: [],
        },
        desc: '一等奖',
        isShow: true,
        isUsed: false,
        frequency: 1,
    },
    {
        id: '004',
        name: '超级大奖',
        sort: 4,
        isAll: false,
        count: 1,
        isUsedCount: 0,
        picture: {
            id: '3',
            name: '超级奖',
            url: prizeImageUrl('image4.svg'),
        },
        separateCount: {
            enable: false,
            countList: [],
        },
        desc: '超级大奖',
        isShow: true,
        isUsed: false,
        frequency: 1,
    },
    {
        id: '005',
        name: '特别奖',
        sort: 5,
        isAll: false,
        count: 1,
        isUsedCount: 0,
        picture: {
            id: '4',
            name: '特别奖',
            url: prizeImageUrl('image5.svg'),
        },
        separateCount: {
            enable: false,
            countList: [],
        },
        desc: '特别奖',
        isShow: true,
        isUsed: false,
        frequency: 1,
    },
]
export const defaultCurrentPrize = <IPrizeConfig>{
    id: '001',
    name: '三等奖',
    sort: 1,
    isAll: false,
    count: 12,
    isUsedCount: 0,
    picture: {
        id: '2',
        name: '三等奖',
        url: prizeImageUrl('image3.svg'),
    },
    separateCount: {
        enable: true,
        countList: [],
    },
    desc: '三等奖',
    isShow: true,
    isUsed: false,
    frequency: 1,
}
export const defaultTemporaryPrize = <IPrizeConfig>{
    id: '',
    name: '',
    sort: 0,
    isAll: false,
    count: 1,
    isUsedCount: 0,
    picture: {
        id: '-1',
        name: '',
        url: '',
    },
    separateCount: {
        enable: true,
        countList: [],
    },
    desc: '',
    isShow: false,
    isUsed: false,
    frequency: 1,
}

export const defaultImageList = [
    {
        id: '0',
        name: '一等奖',
        url: prizeImageUrl('image1.svg'),
    },
    {
        id: '1',
        name: '二等奖',
        url: prizeImageUrl('image2.svg'),
    },
    {
        id: '2',
        name: '三等奖',
        url: prizeImageUrl('image3.svg'),
    },
    {
        id: '3',
        name: '超级奖',
        url: prizeImageUrl('image4.svg'),
    },
    {
        id: '4',
        name: '特别奖',
        url: prizeImageUrl('image5.svg'),
    },
]
export const defaultPatternList = [21, 38, 55, 54, 53, 70, 87, 88, 89, 23, 40, 57, 74, 91, 92, 76, 59, 42, 25, 24, 27, 28, 29, 46, 63, 62, 61, 78, 95, 96, 97, 20, 19, 31, 48, 66, 67, 84, 101, 100, 32, 33, 93, 65, 82, 99]

export const defaultServerHostList = [
    {
        id: 'local',
        name: '本地服务器',
        value: 'local',
        host: 'http://127.0.0.1:8080',
    },
    {
        id: 'custom',
        name: '自定义服务器',
        value: 'custom',
        host: '',
    },
]
