import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadJobComponent } from './read-job.component';

describe('ReadJobComponent', () => {
  let component: ReadJobComponent;
  let fixture: ComponentFixture<ReadJobComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReadJobComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReadJobComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
