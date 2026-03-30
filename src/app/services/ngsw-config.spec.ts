describe('ngsw-config.json dataGroups', () => {
    let ngswConfig: any;

    beforeAll(async () => {
        const response = await fetch('/base/ngsw-config.json');
        ngswConfig = await response.json();
    });

    it('should have dataGroups defined', () => {
        expect(ngswConfig.dataGroups).toBeDefined();
    });

    it('should have exactly 3 dataGroups entries', () => {
        expect(ngswConfig.dataGroups.length).toBe(3);
    });

    it('api-restaurants group should have correct config (Requirement 12.1, 12.4)', () => {
        const group = ngswConfig.dataGroups.find((g: any) => g.name === 'api-restaurants');
        expect(group).toBeDefined();
        expect(group.cacheConfig.strategy).toBe('freshness');
        expect(group.cacheConfig.maxAge).toBe('10m');
        expect(group.cacheConfig.timeout).toBe('10s');
        expect(group.cacheConfig.maxSize).toBe(50);
        expect(group.urls).toContain('/API/Restaurants/**');
    });

    it('api-advertisements group should have correct config (Requirement 12.2, 12.4)', () => {
        const group = ngswConfig.dataGroups.find((g: any) => g.name === 'api-advertisements');
        expect(group).toBeDefined();
        expect(group.cacheConfig.strategy).toBe('freshness');
        expect(group.cacheConfig.maxAge).toBe('10m');
        expect(group.cacheConfig.timeout).toBe('10s');
        expect(group.cacheConfig.maxSize).toBe(50);
        expect(group.urls).toContain('/API/Advertisements/**');
    });

    it('api-reviews group should have correct config (Requirement 12.3, 12.4)', () => {
        const group = ngswConfig.dataGroups.find((g: any) => g.name === 'api-reviews');
        expect(group).toBeDefined();
        expect(group.cacheConfig.strategy).toBe('freshness');
        expect(group.cacheConfig.maxAge).toBe('5m');
        expect(group.cacheConfig.timeout).toBe('10s');
        expect(group.cacheConfig.maxSize).toBe(50);
        expect(group.urls).toContain('/API/Reviews/**');
    });
});
