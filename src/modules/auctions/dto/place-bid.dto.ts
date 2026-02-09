import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PlaceBidDto {
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Type(() => Number)
    amount: number;
}
